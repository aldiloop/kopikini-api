import { Module } from '@nestjs/common';
import { ClockModule } from './common/clock';
import { AppConfigModule } from './config/app-config.module';
import { HealthController } from './health/health.controller';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OrdersModule } from './modules/orders/orders.module';
import { StoreModule } from './modules/store/store.module';

@Module({
  imports: [AppConfigModule, ClockModule, DatabaseModule, AuthModule, StoreModule, CatalogModule, OrdersModule],
  controllers: [HealthController],
})
export class AppModule {}
