import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { CLOCK, Clock } from '../../../common/clock';
import { AppException } from '../../../common/exceptions/app.exception';
import { AppConfigService } from '../../../config/app-config.service';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { UserRole } from '../../auth/domain/auth.ports';
import { CatalogService } from '../../catalog/application/catalog.service';
import { StoreService } from '../../store/application/store.service';
import {
  canTransition,
  isTerminal,
  OrderDetail,
  OrderStatus,
} from '../domain/order.entities';
import { ORDER_REPOSITORY, OrderRepository } from '../domain/order.repository';
import { verifyMidtransSignature } from './midtrans.client';
import { CheckoutDto } from '../presentation/dto/orders.dto';

const TAX_RATE = 0.1;
const PACKAGING_FEE = 1000;
const PAYMENT_EXPIRY_MINUTES = 15;
const STAFF_ROLES: UserRole[] = ['BARISTA', 'STORE_MANAGER', 'ADMIN'];

const toMinor = (v: number) => Math.round(v * 100);
const fromMinor = (v: number) => v / 100;

function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === '23505'
  );
}

function generatePickupPin(): string {
  return String(randomInt(1000, 10000));
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly stores: StoreService,
    private readonly catalog: CatalogService,
    private readonly config: AppConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Checkout (BSD §3 POST /orders/checkout). Harga SELALU dihitung ulang di
   * server via CatalogService.quotePrice — harga dari client tidak pernah
   * dipakai. Tanpa kunci Midtrans, checkout tetap berhasil dengan payment
   * PENDING dan tanpa QR/snap (mode tanpa gateway, terdokumentasi); pembayaran
   * nyata via Midtrans sandbox baru aktif bila kunci diset & diverifikasi.
   */
  async checkout(userId: string, dto: CheckoutDto, idempotencyKey: string): Promise<OrderDetail> {
    if (dto.order_type === 'DELIVERY') {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'Delivery orders are not supported yet', [
        { field: 'order_type', issue: 'Only PICKUP is supported by the web client for now' },
      ]);
    }

    const existing = await this.orders.findByIdempotencyKey(idempotencyKey, userId);
    if (existing) return existing;

    await this.stores.getActiveStore(dto.store_id);

    // Harga & validasi modifier per item, otoritatif dari server.
    const pricedItems = [];
    for (const item of dto.items) {
      const product = await this.catalog.getProduct(item.product_id);
      const quote = await this.catalog.quotePrice(item.product_id, item.modifier_ids ?? [], item.quantity);
      pricedItems.push({
        productId: item.product_id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: quote.unitPrice,
        subtotal: quote.totalPrice,
        notes: item.notes ?? null,
        modifiers: quote.selectedModifiers.map((m) => ({
          groupName: m.groupName,
          modifierId: m.modifierId,
          modifierName: m.name,
          extraPrice: m.extraPrice,
        })),
      });
    }

    const subtotalMinor = pricedItems.reduce((sum, i) => sum + toMinor(i.subtotal), 0);
    const subtotal = fromMinor(subtotalMinor);
    const taxAmount = fromMinor(Math.round(subtotalMinor * TAX_RATE));
    const packagingFee = PACKAGING_FEE;
    const deliveryFee = 0;
    const discountAmount = 0;
    const totalAmount = subtotal + taxAmount + packagingFee + deliveryFee - discountAmount;

    const expiresAt = new Date(this.clock().getTime() + PAYMENT_EXPIRY_MINUTES * 60_000);

    try {
      return await this.orders.createCheckout({
        userId,
        storeId: dto.store_id,
        orderType: dto.order_type,
        paymentChannel: dto.payment_channel,
        notes: dto.notes ?? null,
        idempotencyKey,
        subtotal,
        taxAmount,
        packagingFee,
        deliveryFee,
        discountAmount,
        totalAmount,
        paymentExpiresAt: expiresAt,
        items: pricedItems,
      });
    } catch (err) {
      // Balapan idempotensi: kunci unik dilanggar, kembalikan order yang sudah ada.
      if (isPgUniqueViolation(err)) {
        const replay = await this.orders.findByIdempotencyKey(idempotencyKey, userId);
        if (replay) return replay;
      }
      throw err;
    }
  }

  /** Lacak pesanan: pemiliknya sendiri, atau staf untuk gerai mana pun. */
  async track(orderId: string, user: AuthenticatedUser): Promise<OrderDetail> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw AppException.notFound('Order not found', [{ field: 'order_id', issue: 'Order does not exist' }]);
    }
    if (order.userId !== user.userId && !isStaff(user.role)) {
      throw AppException.notFound('Order not found', [{ field: 'order_id', issue: 'Order does not exist' }]);
    }
    return order;
  }

  listMyOrders(userId: string): Promise<OrderDetail[]> {
    return this.orders.listByUser(userId, 50);
  }

  listStaffOrders(
    filter: { storeId?: string; status?: OrderStatus },
    user: AuthenticatedUser,
  ): Promise<OrderDetail[]> {
    if (!isStaff(user.role)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'Staff access required');
    }
    return this.orders.listForStaff(filter, 100);
  }

  /** Ubah status oleh staf, dengan aturan transisi domain + PIN saat dibayar. */
  async updateStatus(orderId: string, newStatus: OrderStatus, user: AuthenticatedUser): Promise<OrderDetail> {
    if (!isStaff(user.role)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'Staff access required');
    }
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw AppException.notFound('Order not found', [{ field: 'order_id', issue: 'Order does not exist' }]);
    }
    if (!canTransition(order.status, newStatus)) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        `Invalid status transition from ${order.status} to ${newStatus}`,
        [{ field: 'status', issue: `Cannot move order from ${order.status} to ${newStatus}` }],
      );
    }
    const pickupPin =
      newStatus === 'PAYMENT_CONFIRMED' && !order.pickupPin ? generatePickupPin() : undefined;
    const paymentStatus =
      newStatus === 'PAYMENT_CONFIRMED' ? 'PAID' : newStatus === 'CANCELLED' ? 'FAILED' : undefined;
    const settlementTime = newStatus === 'PAYMENT_CONFIRMED' ? this.clock() : undefined;
    const ok = await this.orders.transitionStatus({
      orderId,
      expectedStatus: order.status,
      newStatus,
      pickupPin,
      paymentStatus,
      settlementTime,
    });
    if (!ok) {
      // Status berubah di tengah jalan (balapan); muat ulang apa adanya.
      const fresh = await this.orders.findById(orderId);
      if (fresh) return fresh;
      throw AppException.notFound('Order not found', [{ field: 'order_id', issue: 'Order does not exist' }]);
    }
    const updated = await this.orders.findById(orderId);
    if (!updated) throw AppException.notFound('Order not found', [{ field: 'order_id', issue: 'Order does not exist' }]);
    return updated;
  }

  /**
   * Webhook Midtrans (publik, tanpa JWT). Bila MIDTRANS_SERVER_KEY diset,
   * signature_key WAJIB cocok (SHA512) atau ditolak 403. Bila kunci tidak
   * diset, webhook hanya diterima di luar production (ditolak 503 di
   * production) agar tidak ada pembayaran palsu yang mengonfirmasi order live.
   * Idempotensi: order terminal atau status sudah sama dikembalikan tanpa ubah.
   */
  async handleMidtransWebhook(body: Record<string, unknown>): Promise<OrderDetail> {
    const orderId = asString(body.order_id);
    const transactionStatus = asString(body.transaction_status);
    const statusCode = asString(body.status_code);
    const grossAmount = asString(body.gross_amount);
    const signatureKey = asString(body.signature_key);
    if (!orderId || !transactionStatus || !statusCode || !grossAmount) {
      throw AppException.badRequest('Invalid Midtrans webhook payload', [
        { field: 'order_id', issue: 'order_id, transaction_status, status_code and gross_amount are required' },
      ]);
    }

    const serverKey = this.config.get('MIDTRANS_SERVER_KEY');
    if (serverKey) {
      if (!signatureKey || !verifyMidtransSignature(orderId, statusCode, grossAmount, signatureKey, serverKey)) {
        throw new AppException(HttpStatus.FORBIDDEN, 'Invalid Midtrans signature');
      }
    } else if (this.config.get('NODE_ENV') === 'production') {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'Midtrans webhook requires MIDTRANS_SERVER_KEY in production',
      );
    }

    // order_id Midtrans = order_number kita (lihat buildSnapChargePayload).
    const order = await this.orders.findByOrderNumber(orderId);
    if (!order) {
      throw AppException.notFound('Order not found', [{ field: 'order_id', issue: 'Order does not exist' }]);
    }
    if (isTerminal(order.status)) return order;

    let targetStatus: OrderStatus | null = null;
    let paymentStatus: 'PAID' | 'FAILED' | 'EXPIRED' | undefined;
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      targetStatus = 'PAYMENT_CONFIRMED';
      paymentStatus = 'PAID';
    } else if (transactionStatus === 'pending') {
      return order; // Tetap WAITING_PAYMENT.
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'failure') {
      targetStatus = 'CANCELLED';
      paymentStatus = 'FAILED';
    } else if (transactionStatus === 'expire') {
      targetStatus = 'CANCELLED';
      paymentStatus = 'EXPIRED';
    } else {
      return order; // Status tak dikenal: abaikan, jangan ubah order.
    }

    if (!canTransition(order.status, targetStatus)) return order;
    const pickupPin =
      targetStatus === 'PAYMENT_CONFIRMED' && !order.pickupPin ? generatePickupPin() : undefined;
    const settlementTime = targetStatus === 'PAYMENT_CONFIRMED' ? this.clock() : undefined;
    await this.orders.transitionStatus({
      orderId: order.id,
      expectedStatus: order.status,
      newStatus: targetStatus,
      pickupPin,
      paymentStatus,
      settlementTime,
    });
    const updated = await this.orders.findById(order.id);
    return updated ?? order;
  }
}
