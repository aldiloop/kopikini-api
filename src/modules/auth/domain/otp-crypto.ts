import { createHmac, randomInt, timingSafeEqual } from 'crypto';

export const OTP_LENGTH = 6;

/** OTP 6 digit acak kriptografis (PRD FR-01). */
export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
}

/** HMAC-SHA256 dengan pepper dari environment — OTP/refresh token tidak disimpan plaintext. */
export function hmacSha256(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

/** Perbandingan hash tahan timing-attack. */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
