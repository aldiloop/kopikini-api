import { Module } from '@nestjs/common';
import { StoreModule } from '../store/store.module';
import { CatalogService } from './application/catalog.service';
import { CATALOG_REPOSITORY } from './domain/catalog.repository';
import { PgCatalogRepository } from './infrastructure/pg-catalog.repository';
import { CatalogController } from './presentation/catalog.controller';

@Module({
  imports: [StoreModule],
  controllers: [CatalogController],
  providers: [CatalogService, { provide: CATALOG_REPOSITORY, useClass: PgCatalogRepository }],
  // Dipakai OrdersService untuk validasi & harga server-otoritatif saat checkout.
  exports: [CatalogService],
})
export class CatalogModule {}
