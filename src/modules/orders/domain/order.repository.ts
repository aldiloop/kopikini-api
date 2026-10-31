import {
  OrderDetail,
  OrderItem,
  OrderStatus,
  PaymentChannel,
  PaymentStatus,
} from './order.entities';

export interface CheckoutItemInput extends Omit<OrderItem, 'subtotal'> {
  subtotal: number;
}

export interface CheckoutInput {
  userId: string;
  storeId: string;
  orderType: 'PICKUP' | 'DELIVERY';
  paymentChannel: PaymentChannel;
  notes: string | null;
  idempotencyKey: string;
  subtotal: number;
  taxAmount: number;
  packagingFee: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentExpiresAt: Date;
  items: CheckoutItemInput[];
}

export interface StatusTransitionInput {
  orderId: string;
  expectedStatus: OrderStatus;
  newStatus: OrderStatus;
  pickupPin?: string | null;
  paymentStatus?: PaymentStatus;
  settlementTime?: Date | null;
  transactionId?: string | null;
}

export interface StaffListFilter {
  storeId?: string;
  status?: OrderStatus;
}

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface OrderRepository {
  findById(id: string): Promise<OrderDetail | null>;
  findByOrderNumber(orderNumber: string): Promise<OrderDetail | null>;
  findByIdempotencyKey(key: string, userId: string): Promise<OrderDetail | null>;
  listByUser(userId: string, limit?: number): Promise<OrderDetail[]>;
  listForStaff(filter: StaffListFilter, limit?: number): Promise<OrderDetail[]>;
  /**
   * Simpan checkout dalam SATU transaksi: order + items + modifiers + payment
   * PENDING + status log awal. Nomor order (ORD-YYYYMMDD-NNNN, tanggal WIB)
   * dan queue_number (A-NN) dihitung di dalam transaksi dengan lock tabel
   * orders agar dua checkout bersamaan tidak mendapat nomor yang sama.
   */
  createCheckout(input: CheckoutInput): Promise<OrderDetail>;
  /**
   * Ubah status dalam satu transaksi (update order + log + patch payment bila
   * diberikan). Mengembalikan false bila status order sudah berubah dari
   * expectedStatus (balapan update) — service memuat ulang dan memutuskan.
   */
  transitionStatus(input: StatusTransitionInput): Promise<boolean>;
}
