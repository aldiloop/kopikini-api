import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';
import { ResponseMessage } from '../common/response/response-message.decorator';
import { PG_POOL } from '../infrastructure/database/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** GET /api/v1/health — status API dan koneksi PostgreSQL. 503 bila DB tidak terjangkau. */
  @Get()
  @ResponseMessage('Service healthy')
  async check() {
    try {
      await this.pool.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        message: 'Database unavailable',
        errors: [{ field: 'database', issue: 'PostgreSQL is not reachable' }],
      });
    }
    return { status: 'ok', database: 'up' };
  }
}
