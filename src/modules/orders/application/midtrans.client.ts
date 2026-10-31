import { createHash } from 'crypto';
import { OrderDetail, PaymentChannel } from '../domain/order.entities';

/**
 * Klien Midtrans — STRUKTUR SAJA, BELUM DIPANGGIL.
 *
 * TODO: panggil API Midtrans Snap/Core di sini HANYA setelah kunci sandbox
 * (SB-Mid-server-*) dari user diverifikasi di environment staging, dan hanya
 * bila MIDTRANS_IS_PRODUCTION=false. Sampai saat itu checkout tetap berhasil
 * tanpa gateway (payment PENDING, qr/snap null) — lihat OrdersService.
 * Tidak ada panggilan jaringan ke Midtrans dari tugas ini, dan tidak ada kunci
 * produksi yang pernah dipakai.
 */

export interface MidtransChargePayload {
  transaction_details: { order_id: string; gross_amount: number };
  item_details: { id: string; price: number; quantity: number; name: string }[];
  customer_details: { first_name: string };
  enabled_payments: string[];
}

const ENABLED_PAYMENTS: Record<PaymentChannel, string[]> = {
  QRIS: ['qris'],
  GOPAY: ['gopay'],
  SHOPEEPAY: ['shopeepay'],
  BCA_VA: ['bca_va'],
  MANDIRI_VA: ['mandiri_va'],
};

/** Payload Snap yang AKAN dikirim bila integrasi Midtrans diaktifkan nanti. */
export function buildSnapChargePayload(order: OrderDetail): MidtransChargePayload {
  return {
    transaction_details: { order_id: order.orderNumber, gross_amount: order.totalAmount },
    item_details: order.items.map((item) => ({
      id: item.productId,
      price: item.unitPrice,
      quantity: item.quantity,
      name: item.productName,
    })),
    customer_details: { first_name: 'KopiKini Customer' },
    enabled_payments: ENABLED_PAYMENTS[order.payment.paymentChannel],
  };
}

/**
 * Verifikasi signature_key webhook Midtrans:
 * SHA512(order_id + status_code + gross_amount + server_key), hex lowercase.
 * Dipakai OrdersService untuk webhook — ini komputasi lokal, bukan panggilan API.
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
  serverKey: string,
): boolean {
  const expected = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  return expected === signatureKey.toLowerCase();
}
