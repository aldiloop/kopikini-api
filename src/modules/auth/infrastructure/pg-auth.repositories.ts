import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../infrastructure/database/database.module';
import {
  OtpRecord,
  OtpRepository,
  RefreshTokenRecord,
  RefreshTokenRepository,
  User,
  UserRepository,
  UserRole,
} from '../domain/auth.ports';

interface UserRow {
  id: string;
  phone_number: string;
  full_name: string;
  email: string | null;
  role: UserRole | null;
  loyalty_points: number | null;
}

const USER_COLUMNS = 'id, phone_number, full_name, email, role, loyalty_points';
const mapUser = (r: UserRow): User => ({
  id: r.id,
  phoneNumber: r.phone_number,
  fullName: r.full_name,
  email: r.email,
  role: r.role ?? 'CUSTOMER',
  loyaltyPoints: r.loyalty_points ?? 0,
});

@Injectable()
export class PgUserRepository implements UserRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    const { rows } = await this.pool.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE phone_number = $1`,
      [phoneNumber],
    );
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async create(data: { phoneNumber: string; fullName: string }): Promise<User> {
    // ON CONFLICT menangani race dua verifikasi bersamaan untuk nomor yang sama.
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (phone_number, full_name) VALUES ($1, $2)
       ON CONFLICT (phone_number) DO UPDATE SET updated_at = users.updated_at
       RETURNING ${USER_COLUMNS}`,
      [data.phoneNumber, data.fullName],
    );
    return mapUser(rows[0]);
  }
}

interface OtpRow {
  id: string;
  phone_number: string;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

const mapOtp = (r: OtpRow): OtpRecord => ({
  id: r.id,
  phoneNumber: r.phone_number,
  codeHash: r.code_hash,
  attempts: r.attempts,
  expiresAt: r.expires_at,
  consumedAt: r.consumed_at,
  createdAt: r.created_at,
});

@Injectable()
export class PgOtpRepository implements OtpRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findLatest(phoneNumber: string): Promise<OtpRecord | null> {
    const { rows } = await this.pool.query<OtpRow>(
      `SELECT * FROM otp_codes WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1`,
      [phoneNumber],
    );
    return rows[0] ? mapOtp(rows[0]) : null;
  }

  async create(data: { phoneNumber: string; codeHash: string; expiresAt: Date }): Promise<OtpRecord> {
    const { rows } = await this.pool.query<OtpRow>(
      `INSERT INTO otp_codes (phone_number, code_hash, expires_at) VALUES ($1, $2, $3) RETURNING *`,
      [data.phoneNumber, data.codeHash, data.expiresAt],
    );
    return mapOtp(rows[0]);
  }

  async incrementAttempts(id: string): Promise<number> {
    const { rows } = await this.pool.query<{ attempts: number }>(
      `UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
      [id],
    );
    return rows[0]?.attempts ?? 0;
  }

  async consume(id: string, at: Date): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE otp_codes SET consumed_at = $2 WHERE id = $1 AND consumed_at IS NULL`,
      [id, at],
    );
    return res.rowCount === 1;
  }
}

@Injectable()
export class PgRefreshTokenRepository implements RefreshTokenRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(data: { id: string; userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.pool.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [data.id, data.userId, data.tokenHash, data.expiresAt],
    );
  }

  async findById(id: string): Promise<RefreshTokenRecord | null> {
    const { rows } = await this.pool.query<{
      id: string;
      user_id: string;
      token_hash: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(`SELECT id, user_id, token_hash, expires_at, revoked_at FROM refresh_tokens WHERE id = $1`, [id]);
    const r = rows[0];
    return r
      ? { id: r.id, userId: r.user_id, tokenHash: r.token_hash, expiresAt: r.expires_at, revokedAt: r.revoked_at }
      : null;
  }

  async revoke(id: string, at: Date, replacedBy?: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE refresh_tokens SET revoked_at = $2, replaced_by = $3
        WHERE id = $1 AND revoked_at IS NULL`,
      [id, at, replacedBy ?? null],
    );
    return res.rowCount === 1;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.pool.query(
      `UPDATE refresh_tokens SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId, at],
    );
  }
}
