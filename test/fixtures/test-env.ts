/** Environment khusus test — nilai acak non-produksi, BUKAN kunci sungguhan. */
export function setTestEnv(overrides: Record<string, string> = {}) {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://test:test@127.0.0.1:1/unused',
    JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef0123456789',
    JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef012345678',
    OTP_HASH_SECRET: 'test-otp-hash-secret-0123456789abcdef01234567',
    OTP_DEV_ECHO: 'false',
    ...overrides,
  });
}
