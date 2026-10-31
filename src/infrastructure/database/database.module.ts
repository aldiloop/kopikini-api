import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Pool, types } from 'pg';
import { AppConfigService } from '../../config/app-config.service';

export const PG_POOL = Symbol('PG_POOL');

// INT8 (mis. COUNT(*)) dikembalikan sebagai number, bukan string.
types.setTypeParser(types.builtins.INT8, (v) => Number(v));

/**
 * Pool koneksi PostgreSQL 16. Pool bersifat lazy: aplikasi tetap bisa boot
 * meski DB belum tersedia; koneksi baru dibuka saat query pertama.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new Pool({
          connectionString: config.get('DATABASE_URL'),
          ssl: config.get('DATABASE_SSL') ? { rejectUnauthorized: true } : undefined,
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
