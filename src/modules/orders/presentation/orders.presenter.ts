import { OrderDetail } from '../domain/order.entities';

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

/**
 * Mapper entitas domain (camelCase) -> kontrak JSON API (snake_case, persis
 * seperti tipe Order di kopikini-web/src/shared/types.ts). Angka dikirim
 * sebagai number (bukan string DECIMAL dari pg), tanggal sebagai ISO.
 * Field `simulated` HANYA milik web dan TIDAK pernah dikirim backend.
 */
export const presentOrder = (o: OrderDetail) => ({
  id: o.id,
  order_number: o.orderNumber,
  queue_number: o.queueNumber,
  user_id: o.userId,
  store: { id: o.store.id, name: o.store.name, address: o.store.address },
  order_type: o.orderType,
  status: o.status,
  subtotal: o.subtotal,
  tax_amount: o.taxAmount,
  packaging_fee: o.packagingFee,
  delivery_fee: o.deliveryFee,
  discount_amount: o.discountAmount,
  total_amount: o.totalAmount,
  pickup_pin: o.pickupPin,
  notes: o.notes,
  idempotency_key: o.idempotencyKey,
  items: o.items.map((item) => ({
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.subtotal,
    notes: item.notes,
    modifiers: item.modifiers.map((m) => ({
      group_name: m.groupName,
      modifier_id: m.modifierId,
      modifier_name: m.modifierName,
      extra_price: m.extraPrice,
    })),
  })),
  payment: {
    payment_channel: o.payment.paymentChannel,
    payment_status: o.payment.paymentStatus,
    gross_amount: o.payment.grossAmount,
    qr_payload: o.payment.qrPayload,
    payment_url: o.payment.paymentUrl,
    snap_token: o.payment.snapToken,
    expires_at: iso(o.payment.expiresAt),
    settlement_time: iso(o.payment.settlementTime),
  },
  status_logs: o.statusLogs.map((log) => ({
    previous_status: log.previousStatus,
    new_status: log.newStatus,
    created_at: log.createdAt.toISOString(),
  })),
  created_at: o.createdAt.toISOString(),
});
