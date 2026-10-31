/** Port & entitas modul Auth (tabel users BSD §2 + otp_codes/refresh_tokens migrasi 002). */

export type UserRole = 'CUSTOMER' | 'BARISTA' | 'STORE_MANAGER' | 'ADMIN';

export interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  loyaltyPoints: number;
}

export interface OtpRecord {
  id: string;
  phoneNumber: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByPhone(phoneNumber: string): Promise<User | null>;
  create(data: { phoneNumber: string; fullName: string }): Promise<User>;
}

export const OTP_REPOSITORY = Symbol('OTP_REPOSITORY');
export interface OtpRepository {
  /** OTP terbaru untuk nomor tsb (terlepas dari status). */
  findLatest(phoneNumber: string): Promise<OtpRecord | null>;
  create(data: { phoneNumber: string; codeHash: string; expiresAt: Date }): Promise<OtpRecord>;
  /** Naikkan counter percobaan; kembalikan nilai terbaru. */
  incrementAttempts(id: string): Promise<number>;
  /** Tandai terpakai secara atomik; false bila sudah terpakai sebelumnya. */
  consume(id: string, at: Date): Promise<boolean>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
export interface RefreshTokenRepository {
  create(data: { id: string; userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findById(id: string): Promise<RefreshTokenRecord | null>;
  /** Cabut token secara atomik; false bila sudah dicabut. */
  revoke(id: string, at: Date, replacedBy?: string): Promise<boolean>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
}

export const OTP_SENDER = Symbol('OTP_SENDER');
/** Pengirim OTP (WhatsApp/SMS). Provider nyata belum dipilih — lihat ConsoleOtpSender. */
export interface OtpSender {
  send(phoneNumber: string, code: string): Promise<void>;
}
