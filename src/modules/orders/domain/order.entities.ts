/** Entitas Orders (BSD §2: orders, order_items, order_item_modifiers, payments, order_status_logs). */

export type OrderType = 'PICKUP' | 'DELIVERY';
export type OrderStatus =
  | 'WAITING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUNDED';
export type PaymentChannel = 'QRIS' | 'GOPAY' | 'SHOPEEPAY' | 'BCA_VA' | 'MANDIRI_VA';

export const ORDER_STATUSES: OrderStatus[] = [
  'WAITING_PAYMENT',
  'PAYMENT_CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
];

export const PAYMENT_CHANNELS: PaymentChannel[] = [
  'QRIS',
  'GOPAY',
  'SHOPEEPAY',
  'BCA_VA',
  'MANDIRI_VA',
];

export interface OrderItemModifier {
  groupName: string;
  modifierId: string;
  modifierName: string;
  extraPrice: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  modifiers: OrderItemModifier[];
}

export interface OrderStatusLog {
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  createdAt: Date;
}

export interface Payment {
  paymentChannel: PaymentChannel;
  paymentStatus: PaymentStatus;
  grossAmount: number;
  qrPayload: string | null;
  paymentUrl: string | null;
  snapToken: string | null;
  expiresAt: Date | null;
  settlementTime: Date | null;
  transactionId: string | null;
}

export interface OrderStore {
  id: string;
  name: string;
  address: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  queueNumber: string | null;
  userId: string;
  store: OrderStore;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  packagingFee: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  pickupPin: string | null;
  notes: string | null;
  idempotencyKey: string | null;
  items: OrderItem[];
  payment: Payment;
  statusLogs: OrderStatusLog[];
  createdAt: Date;
}

/**
 * Aturan transisi status yang valid. CANCELLED dan COMPLETED adalah terminal
 * (tidak ada transisi keluar). Delivery belum dipakai web, tapi transisi
 * OUT_FOR_DELIVERY -> COMPLETED tetap didukung untuk masa depan.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  WAITING_PAYMENT: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['COMPLETED'],
  OUT_FOR_DELIVERY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: OrderStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED';
}
