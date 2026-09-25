import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders-admin.controller';
import { OrdersService } from './orders.service';
import { CouponsModule } from '../coupons/coupons.module';
import { EmailModule } from '../email/email.module';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [CouponsModule, EmailModule, SheetsModule],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
