import { Module } from '@nestjs/common';
import { StoreService } from './application/store.service';
import { STORE_REPOSITORY } from './domain/store.repository';
import { PgStoreRepository } from './infrastructure/pg-store.repository';
import { StoreController } from './presentation/store.controller';

@Module({
  controllers: [StoreController],
  providers: [
    StoreService,
    { provide: STORE_REPOSITORY, useClass: PgStoreRepository },
  ],
  exports: [StoreService],
})
export class StoreModule {}
