-- =============================================================================
-- KopiKini — 002_auth_otp_refresh_tokens.sql
-- TAMBAHAN di luar DDL BSD §2. Dibutuhkan modul Auth (IPD Hari 4) karena BSD
-- belum mendefinisikan penyimpanan OTP dan refresh token:
--   * TRD §6.1: access token 15 menit, refresh token 30 hari dengan rotasi.
--   * PRD FR-01: OTP 6 digit, countdown kirim ulang 60 detik.
-- Kode OTP dan refresh token TIDAK disimpan plaintext — hanya hash SHA-256 (HMAC).
-- Bila nanti Redis 7 tersedia, OTP dapat dipindah ke Redis tanpa mengubah API.
-- =============================================================================

CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_codes_phone_created ON otp_codes(phone_number, created_at DESC);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
