import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

/**
 * Validasi environment variable saat boot. Secret WAJIB datang dari environment —
 * tidak ada nilai default untuk secret di kode (ANTIGRAVITY_PROMPT: batasan).
 */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @Transform(({ value }) => Number(value))
  @IsInt()
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @Transform(toBool)
  @IsBoolean()
  DATABASE_SSL = false;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS = 900;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  JWT_REFRESH_TTL_DAYS = 30;

  @IsString()
  @MinLength(32)
  OTP_HASH_SECRET: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(60)
  OTP_TTL_SECONDS = 300;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  OTP_RESEND_COOLDOWN_SECONDS = 60;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(10)
  OTP_MAX_ATTEMPTS = 5;

  @Transform(toBool)
  @IsBoolean()
  OTP_DEV_ECHO = false;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0.1)
  @Max(100)
  STORE_NEARBY_DEFAULT_RADIUS_KM = 10;

  @IsOptional()
  @IsString()
  STORE_TIMEZONE = 'Asia/Jakarta';

  // --- Midtrans (OPSIONAL, sandbox saja) ---------------------------------
  // Kosong = mode tanpa gateway: checkout tetap berhasil dengan payment
  // PENDING tanpa QR/snap. Kunci produksi TIDAK PERNAH dipakai di sini;
  // bila MIDTRANS_IS_PRODUCTION=true, kunci sandbox (SB-Mid-*) ditolak.
  @IsOptional()
  @IsString()
  MIDTRANS_SERVER_KEY = '';

  @IsOptional()
  @IsString()
  MIDTRANS_CLIENT_KEY = '';

  @Transform(toBool)
  @IsBoolean()
  MIDTRANS_IS_PRODUCTION = false;
}

export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n  ');
    throw new Error(`Invalid environment configuration:\n  ${detail}`);
  }
  if (env.NODE_ENV === 'production') env.OTP_DEV_ECHO = false;
  // Validasi kunci Midtrans: di luar produksi, kunci yang diisi harus kunci
  // sandbox (SB-Mid-*); di produksi, kunci sandbox ditolak mentah-mentah.
  const serverKey = env.MIDTRANS_SERVER_KEY.trim();
  const clientKey = env.MIDTRANS_CLIENT_KEY.trim();
  if (env.MIDTRANS_IS_PRODUCTION) {
    if (serverKey.startsWith('SB-Mid-') || clientKey.startsWith('SB-Mid-')) {
      throw new Error('Invalid environment configuration:\n  MIDTRANS_*: sandbox keys (SB-Mid-*) are not allowed in production mode');
    }
  } else {
    if (serverKey && !serverKey.startsWith('SB-Mid-server-')) {
      throw new Error('Invalid environment configuration:\n  MIDTRANS_SERVER_KEY: must start with SB-Mid-server- (sandbox) when set');
    }
    if (clientKey && !clientKey.startsWith('SB-Mid-client-')) {
      throw new Error('Invalid environment configuration:\n  MIDTRANS_CLIENT_KEY: must start with SB-Mid-client- (sandbox) when set');
    }
  }
  return env;
}
