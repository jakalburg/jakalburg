import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MaintenanceGuard } from './maintenance/maintenance.guard';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { CouponsModule } from './coupons/coupons.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AddressesModule } from './addresses/addresses.module';
import { StorageModule } from './storage/storage.module';
import { FabricsModule } from './fabrics/fabrics.module';
import { CategoriesModule } from './categories/categories.module';
import { CollectionsModule } from './collections/collections.module';
import { AdminModule } from './admin/admin.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WebsiteModule } from './website/website.module';
import { ContactModule } from './contact/contact.module';
import { PagesModule } from './pages/pages.module';
import { SettingsModule } from './settings/settings.module';
import { PaymentsModule } from './payments/payments.module';
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
    RedisModule,
    MaintenanceModule,
    EmailModule,
    AuthModule,
    ProductsModule,
    CartModule,
    NotificationsModule,
    OrdersModule,
    CouponsModule,
    ReviewsModule,
    AddressesModule,
    StorageModule,
    FabricsModule,
    CategoriesModule,
    CollectionsModule,
    AdminModule,
    CustomersModule,
    DashboardModule,
    WebsiteModule,
    ContactModule,
    PagesModule,
    SettingsModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Registered AFTER the throttler so rate limiting still applies to the
    // few routes that stay open during maintenance.
    { provide: APP_GUARD, useClass: MaintenanceGuard },
  ],
})
export class AppModule {}
