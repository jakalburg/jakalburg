import { Global, Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import {
  MaintenanceController,
  MaintenanceStatusController,
} from './maintenance.controller';
import { SettingsModule } from '../settings/settings.module';

/**
 * MaintenanceModule — the storefront kill switch.
 *
 * @Global because MaintenanceGuard is registered as an APP_GUARD in
 * AppModule and needs MaintenanceService injectable from the root context.
 */
@Global()
@Module({
  // For the store name + logo on the status payload. SettingsService caches
  // through Redis, so branding the maintenance page costs no extra database
  // read on a path the storefront middleware hits for every page view.
  imports: [SettingsModule],
  controllers: [MaintenanceStatusController, MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
