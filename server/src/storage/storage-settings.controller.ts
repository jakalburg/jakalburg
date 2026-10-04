import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorageSettingsService } from './storage-settings.service';
import { UploadService } from './upload.service';
import { UpdateStorageSettingsDto } from './dto/update-storage-settings.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * StorageSettingsController — media storage config behind the admin's
 * Settings → Media screen.
 *
 * EVERY route is @AdminOnly(): unlike the Settings singleton (which the
 * storefront reads publicly), this holds credentials. None of the three
 * secrets is ever returned — reads expose only the isXConfigured flags.
 */
@ApiTags('Settings')
@Controller('settings/storage')
export class StorageSettingsController {
  constructor(
    private readonly storageSettings: StorageSettingsService,
    private readonly uploadService: UploadService,
  ) {}

  /** Admin: current storage + cache settings, secrets excluded. */
  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: media storage and cache settings' })
  @ApiOkResponse({ description: 'Settings plus isXConfigured flags.' })
  get() {
    return this.storageSettings.getForAdmin();
  }

  /** Admin: update them. Blank secrets leave the stored ones untouched. */
  @Patch()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update media storage and cache settings' })
  @ApiOkResponse({ description: 'The updated settings, secrets excluded.' })
  update(@Body() dto: UpdateStorageSettingsDto) {
    return this.storageSettings.update(dto);
  }

  /** Admin: authenticate against the ACTIVE provider without transferring. */
  @Post('verify')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: verify the active storage provider' })
  @ApiOkResponse({ description: '{ success, message, provider }.' })
  verify() {
    return this.uploadService.verifyActiveProvider();
  }

  /**
   * Admin: per-provider usage.
   *
   * Hits Cloudinary's usage API and lists the R2 bucket, so it is NOT free —
   * the admin screen fetches it on demand rather than polling. The reference
   * polls this every 30s, which on Cloudinary's free tier (500 admin API calls
   * per hour) burns a quarter of the hourly allowance from one open tab.
   */
  @Get('usage')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: per-provider storage usage' })
  @ApiOkResponse({ description: 'Usage for Cloudinary and R2.' })
  usage() {
    return this.uploadService.getStorageUsage();
  }
}
