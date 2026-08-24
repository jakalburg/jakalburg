import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { AddressesModule } from './addresses/addresses.module';
import { StorageModule } from './storage/storage.module';
import { FabricsModule } from './fabrics/fabrics.module';
import { CollectionsModule } from './collections/collections.module';
import { AdminModule } from './admin/admin.module';
import { CustomersModule } from './customers/customers.module';
import { WebsiteModule } from './website/website.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    // Global rate limiting — 60 requests / minute per IP by default.
    // Sensitive auth routes tighten this further via @Throttle().
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    EmailModule,
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    AddressesModule,
    StorageModule,
    FabricsModule,
    CollectionsModule,
    AdminModule,
    CustomersModule,
    WebsiteModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
