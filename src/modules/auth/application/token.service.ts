import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { CLOCK, Clock } from '../../../common/clock';
import { AppException } from '../../../common/exceptions/app.exception';
import { AppConfigService } from '../../../config/app-config.service';
import {
  REFRESH_TOKEN_REPOSITORY,
  RefreshTokenRepository,
  User,
  UserRole,
} from '../domain/auth.ports';
import { hmacSha256, safeEqualHex } from '../domain/otp-crypto';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  phone: string;
  typ: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  typ: 'refresh';
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_expires_in: number;
}

/**
 * Penerbitan JWT (TRD §6.1): access token 15 menit, refresh token 30 hari dengan
 * rotasi. Refresh token disimpan sebagai hash; pemakaian ulang token yang sudah
 * dirotasi dianggap pencurian dan mencabut seluruh sesi pengguna.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async issue(user: User): Promise<TokenPair> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL_SECONDS');
    const refreshTtl = this.config.get('JWT_REFRESH_TTL_DAYS') * 24 * 60 * 60;

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      phone: user.phoneNumber,
      typ: 'access',
    };
    const access_token = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: accessTtl,
    });

    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti, typ: 'refresh' };
    const refresh_token = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: refreshTtl,
    });
    await this.refreshTokens.create({
      id: jti,
      userId: user.id,
      tokenHash: this.hash(refresh_token),
      expiresAt: new Date(this.clock().getTime() + refreshTtl * 1000),
    });

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: accessTtl,
      refresh_expires_in: refreshTtl,
    };
  }

  /** Validasi refresh token & cabut (rotasi). Mengembalikan userId pemilik. */
  async consumeRefreshToken(token: string): Promise<string> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw AppException.unauthorized('Invalid or expired refresh token');
    }
    if (payload.typ !== 'refresh' || !payload.jti) {
      throw AppException.unauthorized('Invalid or expired refresh token');
    }

    const record = await this.refreshTokens.findById(payload.jti);
    const now = this.clock();
    if (!record || record.userId !== payload.sub || !safeEqualHex(record.tokenHash, this.hash(token))) {
      throw AppException.unauthorized('Invalid or expired refresh token');
    }
    if (record.revokedAt) {
      // Reuse detection: token lama dipakai lagi -> cabut semua sesi.
      await this.refreshTokens.revokeAllForUser(record.userId, now);
      throw AppException.unauthorized('Refresh token reuse detected; please log in again');
    }
    if (record.expiresAt.getTime() <= now.getTime()) {
      throw AppException.unauthorized('Invalid or expired refresh token');
    }
    const revoked = await this.refreshTokens.revoke(record.id, now);
    if (!revoked) throw AppException.unauthorized('Invalid or expired refresh token');
    return record.userId;
  }

  private hash(token: string): string {
    return hmacSha256(token, this.config.get('OTP_HASH_SECRET'));
  }
}
