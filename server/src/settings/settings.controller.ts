import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * SettingsController — the global store identity (marks, name, contact details,
 * socials, SEO defaults) behind the admin's Settings → Store screen.
 *
 * GET is PUBLIC: the storefront's header, footer, SEO tags and /contact page
 * all read it, so every field on this model is public by definition. Keep
 * credentials and keys off it. PATCH is @AdminOnly().
 */
@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Public: the store settings (singleton). */
  @Get()
  @ApiOperation({ summary: 'Public: global store settings' })
  @ApiOkResponse({
    description: 'Brand marks, store name, contact details, socials and SEO.',
  })
  get() {
    return this.settingsService.get();
  }

  /** Admin: update the store settings. */
  @Patch()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update global store settings' })
  @ApiOkResponse({ description: 'The updated settings.' })
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto);
  }
}
