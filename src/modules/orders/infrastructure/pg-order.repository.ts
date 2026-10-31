import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';
import { toNumber } from '../../../infrastructure/database/pg-mappers';
import {
  OrderDetail,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentChannel,
  PaymentStatus,
} from '../domain/order.entities';
import {
  CheckoutInput,
  OrderRepository,
  StaffListFilter,
  StatusTransitionInput,
} from '../domain/order.repository';

interface OrderRow {
  id: string;
  order_number: string;
  queue_number: string | null;
  user_id: string;
  store_id: string;
  store_name: string;
  store_address: string;
  order_type: string;
  status: string;
  subtotal: string;
  tax_amount: string;
  packaging_fee: string;
  delivery_fee: string;
  discount_amount: string;
  total_amount: string;
  pickup_pin: string | null;
  notes: string | null;
  idempotency_key: string | null;
  created_at: Date;
}

interface OrderItemRow {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
  notes: string | null;
}

interface OrderItemModifierRow {
  order_item_id: string;
  modifier_id: string | null;
  group_name: string | null;
  modifier_name: string;
  extra_price: string;
}

interface PaymentRow {
  payment_channel: string;
  payment_status: string;
  gross_amount: string;
  qr_payload: string | null;
  payment_url: string | null;
  snap_token: string | null;
  expires_at: Date | null;
  settlement_time: Date | null;
  transaction_id: string | null;
}

interface StatusLogRow {
  previous_status: string | null;
  new_status: string;
  created_at: Date;
}

const ORDER_COLUMNS = `o.id, o.order_number, o.queue_number, o.user_id, o.store_id,
  s.name AS store_name, s.address AS store_address, o.order_type, o.status,
  o.subtotal, o.tax_amount, o.packaging_fee, o.delivery_fee, o.discount_amount,
  o.total_amount, o.pickup_pin, o.notes, o.idempotency_key, o.created_at`;

function toStatus(value: string): OrderStatus {
  return value as OrderStatus;
}

@Injectable()
export class PgOrderRepository implements OrderRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findById(id: string): Promise<OrderDetail | null> {
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT ${ORDER_COLUMNS}
         FROM orders o JOIN stores s ON s.id = o.store_id
        WHERE o.id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    return this.loadDetail(rows[0]);
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderDetail | null> {
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT ${ORDER_COLUMNS}
         FROM orders o JOIN stores s ON s.id = o.store_id
        WHERE o.order_number = $1`,
      [orderNumber],
    );
    if (!rows[0]) return null;
    return this.loadDetail(rows[0]);
  }

  async findByIdempotencyKey(key: string, userId: string): Promise<OrderDetail | null> {
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT ${ORDER_COLUMNS}
         FROM orders o JOIN stores s ON s.id = o.store_id
        WHERE o.idempotency_key = $1 AND o.user_id = $2`,
      [key, userId],
    );
    if (!rows[0]) return null;
    return this.loadDetail(rows[0]);
  }

  async listByUser(userId: string, limit = 50): Promise<OrderDetail[]> {
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT ${ORDER_COLUMNS}
         FROM orders o JOIN stores s ON s.id = o.store_id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2`,
      [userId, limit],
    );
    const details: OrderDetail[] = [];
    for (const row of rows) details.push(await this.loadDetail(row));
    return details;
  }

  async listForStaff(filter: StaffListFilter, limit = 100): Promise<OrderDetail[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter.storeId) {
      params.push(filter.storeId);
      conditions.push(`o.store_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`o.status = $${params.length}`);
    }
    params.push(limit);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query<OrderRow>(
      `SELECT ${ORDER_COLUMNS}
         FROM orders o JOIN stores s ON s.id = o.store_id
         ${where}
        ORDER BY o.created_at DESC
        LIMIT $${params.length}`,
      params,
    );
    const details: OrderDetail[] = [];
    for (const row of rows) details.push(await this.loadDetail(row));
    return details;
  }

  async createCheckout(input: CheckoutInput): Promise<OrderDetail> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialisasi penomoran harian: hitung urutan hari ini (WIB) di bawah lock.
      await client.query('LOCK TABLE orders IN SHARE ROW EXCLUSIVE MODE');
      const seqRes = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM orders
          WHERE (created_at AT TIME ZONE 'Asia/Jakarta')::date =
                (now() AT TIME ZONE 'Asia/Jakarta')::date`,
      );
      const seq = (seqRes.rows[0]?.count ?? 0) + 1;
      const ymdRes = await client.query<{ ymd: string }>(
        `SELECT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD') AS ymd`,
      );
      const ymd = ymdRes.rows[0]?.ymd ?? '00000000';
      const orderNumber = `ORD-${ymd}-${String(seq).padStart(4, '0')}`;
      const queueNumber = `A-${String(seq).padStart(2, '0')}`;

      const orderRes = await client.query<{ id: string }>(
        `INSERT INTO orders
           (order_number, queue_number, user_id, store_id, order_type, status,
            subtotal, tax_amount, packaging_fee, delivery_fee, discount_amount,
            total_amount, pickup_pin, notes, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, 'WAITING_PAYMENT',
                 $6, $7, $8, $9, $10, $11, NULL, $12, $13)
         RETURNING id`,
        [
          orderNumber,
          queueNumber,
          input.userId,
          input.storeId,
          input.orderType,
          input.subtotal,
          input.taxAmount,
          input.packagingFee,
          input.deliveryFee,
          input.discountAmount,
          input.totalAmount,
          input.notes,
          input.idempotencyKey,
        ],
      );
      const orderId = orderRes.rows[0].id;

      for (const item of input.items) {
        const itemRes = await client.query<{ id: string }>(
          `INSERT INTO order_items
             (order_id, product_id, product_name, quantity, unit_price, subtotal, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [orderId, item.productId, item.productName, item.quantity, item.unitPrice, item.subtotal, item.notes],
        );
        const itemId = itemRes.rows[0].id;
        for (const mod of item.modifiers) {
          await client.query(
            `INSERT INTO order_item_modifiers
               (order_item_id, modifier_id, group_name, modifier_name, extra_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [itemId, mod.modifierId, mod.groupName, mod.modifierName, mod.extraPrice],
          );
        }
      }

      await client.query(
        `INSERT INTO payments
           (order_id, payment_channel, payment_status, gross_amount,
            qr_payload, payment_url, snap_token, expires_at)
         VALUES ($1, $2, 'PENDING', $3, NULL, NULL, NULL, $4)`,
        [orderId, input.paymentChannel, input.totalAmount, input.paymentExpiresAt],
      );

      await client.query(
        `INSERT INTO order_status_logs (order_id, previous_status, new_status)
         VALUES ($1, NULL, 'WAITING_PAYMENT')`,
        [orderId],
      );

      await client.query('COMMIT');
      const detail = await this.findById(orderId);
      if (!detail) throw new Error('Order was created but could not be reloaded');
      return detail;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async transitionStatus(input: StatusTransitionInput): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updated = await client.query(
        `UPDATE orders
            SET status = $2,
                pickup_pin = COALESCE($3, pickup_pin),
                updated_at = now()
          WHERE id = $1 AND status = $4`,
        [input.orderId, input.newStatus, input.pickupPin ?? null, input.expectedStatus],
      );
      if ((updated.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return false;
      }
      await client.query(
        `INSERT INTO order_status_logs (order_id, previous_status, new_status)
         VALUES ($1, $2, $3)`,
        [input.orderId, input.expectedStatus, input.newStatus],
      );
      if (input.paymentStatus !== undefined) {
        await client.query(
          `UPDATE payments
              SET payment_status = $2,
                  settlement_time = COALESCE($3, settlement_time),
                  transaction_id = COALESCE($4, transaction_id)
            WHERE order_id = $1`,
          [input.orderId, input.paymentStatus, input.settlementTime ?? null, input.transactionId ?? null],
        );
      }
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  private async loadDetail(row: OrderRow): Promise<OrderDetail> {
    const [itemsRes, paymentRes, logsRes] = await Promise.all([
      this.pool.query<OrderItemRow>(
        `SELECT id, product_id, product_name, quantity, unit_price, subtotal, notes
           FROM order_items WHERE order_id = $1 ORDER BY id`,
        [row.id],
      ),
      this.pool.query<PaymentRow>(
        `SELECT payment_channel, payment_status, gross_amount, qr_payload,
                payment_url, snap_token, expires_at, settlement_time, transaction_id
           FROM payments WHERE order_id = $1`,
        [row.id],
      ),
      this.pool.query<StatusLogRow>(
        `SELECT previous_status, new_status, created_at
           FROM order_status_logs WHERE order_id = $1 ORDER BY created_at ASC`,
        [row.id],
      ),
    ]);
    const paymentRow = paymentRes.rows[0];
    if (!paymentRow) throw new Error(`Payment row missing for order ${row.id}`);

    const itemIds = itemsRes.rows.map((r) => r.id);
    const modsRes =
      itemIds.length === 0
        ? { rows: [] as OrderItemModifierRow[] }
        : await this.pool.query<OrderItemModifierRow>(
            `SELECT order_item_id, modifier_id, group_name, modifier_name, extra_price
               FROM order_item_modifiers WHERE order_item_id = ANY($1::uuid[])`,
            [itemIds],
          );
    const modifiersByItem = new Map<string, OrderItem['modifiers']>();
    for (const m of modsRes.rows) {
      const list = modifiersByItem.get(m.order_item_id) ?? [];
      list.push({
        groupName: m.group_name ?? '',
        modifierId: m.modifier_id ?? '',
        modifierName: m.modifier_name,
        extraPrice: toNumber(m.extra_price),
      });
      modifiersByItem.set(m.order_item_id, list);
    }

    const items: OrderItem[] = itemsRes.rows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      quantity: r.quantity,
      unitPrice: toNumber(r.unit_price),
      subtotal: toNumber(r.subtotal),
      notes: r.notes,
      modifiers: modifiersByItem.get(r.id) ?? [],
    }));

    const payment: Payment = {
      paymentChannel: paymentRow.payment_channel as PaymentChannel,
      paymentStatus: paymentRow.payment_status as PaymentStatus,
      grossAmount: toNumber(paymentRow.gross_amount),
      qrPayload: paymentRow.qr_payload,
      paymentUrl: paymentRow.payment_url,
      snapToken: paymentRow.snap_token,
      expiresAt: paymentRow.expires_at,
      settlementTime: paymentRow.settlement_time,
      transactionId: paymentRow.transaction_id,
    };

    return {
      id: row.id,
      orderNumber: row.order_number,
      queueNumber: row.queue_number,
      userId: row.user_id,
      store: { id: row.store_id, name: row.store_name, address: row.store_address },
      orderType: row.order_type as OrderDetail['orderType'],
      status: toStatus(row.status),
      subtotal: toNumber(row.subtotal),
      taxAmount: toNumber(row.tax_amount),
      packagingFee: toNumber(row.packaging_fee),
      deliveryFee: toNumber(row.delivery_fee),
      discountAmount: toNumber(row.discount_amount),
      totalAmount: toNumber(row.total_amount),
      pickupPin: row.pickup_pin,
      notes: row.notes,
      idempotencyKey: row.idempotency_key,
      items,
      payment,
      statusLogs: logsRes.rows.map((r) => ({
        previousStatus: r.previous_status ? toStatus(r.previous_status) : null,
        newStatus: toStatus(r.new_status),
        createdAt: r.created_at,
      })),
      createdAt: row.created_at,
    };
  }
}
