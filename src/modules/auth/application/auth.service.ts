import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../../common/clock';
import { AppException } from '../../../common/exceptions/app.exception';
import { AppConfigService } from '../../../config/app-config.service';
import {
  OTP_REPOSITORY,
  OTP_SENDER,
  OtpRepository,
  OtpSender,
  User,
  USER_REPOSITORY,
  UserRepository,
} from '../domain/auth.ports';
import { generateOtp, hmacSha256, safeEqualHex } from '../domain/otp-crypto';
import { normalizeIndonesianPhone } from '../domain/phone';
import { TokenPair, TokenService } from './token.service';

export interface OtpRequestResult {
  phone_number: string;
  expires_in: number;
  resend_in: number;
  is_registered: boolean;
  /** Hanya bila OTP_DEV_ECHO=true dan NODE_ENV != production. */
  dev_otp?: string;
}

export interface AuthResult extends TokenPair {
  user: ReturnType<typeof presentUser>;
  is_new_user: boolean;
}

export const presentUser = (u: User) => ({
  id: u.id,
  phone_number: u.phoneNumber,
  full_name: u.fullName,
  email: u.email,
  role: u.role,
  loyalty_points: u.loyaltyPoints,
});

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository,
    @Inject(OTP_SENDER) private readonly sender: OtpSender,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** POST /auth/otp-request — kirim OTP 6 digit; cooldown kirim ulang 60 detik (PRD FR-01). */
  async requestOtp(rawPhone: string): Promise<OtpRequestResult> {
    const phone = this.normalize(rawPhone);
    const now = this.clock();
    const cooldown = this.config.get('OTP_RESEND_COOLDOWN_SECONDS');

    const latest = await this.otps.findLatest(phone);
    if (latest) {
      const elapsed = Math.floor((now.getTime() - latest.createdAt.getTime()) / 1000);
      if (elapsed < cooldown) {
        throw AppException.tooManyRequests('Please wait before requesting a new OTP', [
          { field: 'phone_number', issue: `Retry after ${cooldown - elapsed} seconds` },
        ]);
      }
    }

    const code = generateOtp();
    const ttl = this.config.get('OTP_TTL_SECONDS');
    await this.otps.create({
      phoneNumber: phone,
      codeHash: this.hashOtp(phone, code),
      expiresAt: new Date(now.getTime() + ttl * 1000),
    });
    await this.sender.send(phone, code);

    const result: OtpRequestResult = {
      phone_number: phone,
      expires_in: ttl,
      resend_in: cooldown,
      is_registered: (await this.users.findByPhone(phone)) !== null,
    };
    if (this.config.get('OTP_DEV_ECHO') && !this.config.isProduction) result.dev_otp = code;
    return result;
  }

  /**
   * POST /auth/otp-verify — verifikasi OTP lalu terbitkan JWT.
   * Pengguna baru wajib mengirim `full_name` (PRD FR-01; users.full_name NOT NULL).
   */
  async verifyOtp(rawPhone: string, otp: string, fullName?: string): Promise<AuthResult> {
    const phone = this.normalize(rawPhone);
    const now = this.clock();
    const maxAttempts = this.config.get('OTP_MAX_ATTEMPTS');
    const invalid = (issue: string) =>
      AppException.badRequest('Invalid or expired OTP', [{ field: 'otp', issue }]);

    const record = await this.otps.findLatest(phone);
    if (!record || record.consumedAt || record.expiresAt.getTime() <= now.getTime()) {
      throw invalid('OTP not found or expired; request a new one');
    }
    if (record.attempts >= maxAttempts) {
      throw AppException.tooManyRequests('Too many invalid attempts', [
        { field: 'otp', issue: 'Request a new OTP' },
      ]);
    }
    if (!safeEqualHex(record.codeHash, this.hashOtp(phone, otp))) {
      const attempts = await this.otps.incrementAttempts(record.id);
      throw invalid(`Incorrect OTP; ${Math.max(0, maxAttempts - attempts)} attempt(s) left`);
    }

    let user = await this.users.findByPhone(phone);
    const isNewUser = user === null;
    const name = fullName?.trim();
    if (!user && !name) {
      // OTP belum dikonsumsi agar klien bisa mengulang dengan full_name.
      throw AppException.badRequest('Full name is required for new users', [
        { field: 'full_name', issue: 'Required when registering a new phone number' },
      ]);
    }

    if (!(await this.otps.consume(record.id, now))) throw invalid('OTP already used');
    if (!user) user = await this.users.create({ phoneNumber: phone, fullName: name! });

    return { ...(await this.tokens.issue(user)), user: presentUser(user), is_new_user: isNewUser };
  }

  /** POST /auth/refresh — rotasi refresh token. */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const userId = await this.tokens.consumeRefreshToken(refreshToken);
    const user = await this.users.findById(userId);
    if (!user) throw AppException.unauthorized('User no longer exists');
    return { ...(await this.tokens.issue(user)), user: presentUser(user), is_new_user: false };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw AppException.unauthorized('User no longer exists');
    return presentUser(user);
  }

  private normalize(raw: string): string {
    const phone = normalizeIndonesianPhone(raw);
    if (!phone) {
      throw AppException.badRequest('Validation failed', [
        { field: 'phone_number', issue: 'Must be a valid Indonesian mobile number' },
      ]);
    }
    return phone;
  }

  /** Hash terikat ke nomor HP agar OTP tidak bisa dipakai untuk nomor lain. */
  private hashOtp(phone: string, code: string): string {
    return hmacSha256(`${phone}:${code}`, this.config.get('OTP_HASH_SECRET'));
  }
}
