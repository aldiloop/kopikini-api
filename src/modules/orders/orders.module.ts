import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { StoreModule } from '../store/store.module';
import { OrdersService } from './application/orders.service';
import { ORDER_REPOSITORY } from './domain/order.repository';
import { PgOrderRepository } from './infrastructure/pg-order.repository';
import { MidtransWebhookController, OrdersController } from './presentation/orders.controller';
import { RolesGuard } from './presentation/roles.guard';

@Module({
  imports: [AuthModule, StoreModule, CatalogModule],
  controllers: [OrdersController, MidtransWebhookController],
  providers: [
    OrdersService,
    RolesGuard,
    { provide: ORDER_REPOSITORY, useClass: PgOrderRepository },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
