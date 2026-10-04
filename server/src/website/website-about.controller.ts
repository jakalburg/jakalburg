import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebsiteService } from './website.service';
import { UpdateWebsiteAboutDto } from './dto/update-website-about.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * WebsiteAboutController — the storefront About page content.
 *
 * GET is PUBLIC (the /about page renders it). PATCH is @AdminOnly() and backs
 * the admin's Website → About Page tab. Split from WebsiteController because a
 * controller has a single base path — same shape as WebsiteContactController.
 */
@ApiTags('Website')
@Controller('website/about')
export class WebsiteAboutController {
  constructor(private readonly websiteService: WebsiteService) {}

  /** Public: the About page content (singleton). */
  @Get()
  @ApiOperation({ summary: 'Public: about page content' })
  @ApiOkResponse({ description: 'Hero, heading and body copy.' })
  getAbout() {
    return this.websiteService.getAbout();
  }

  /** Admin: update the About page content. */
  @Patch()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update about page content' })
  @ApiOkResponse({ description: 'The updated content.' })
  updateAbout(@Body() dto: UpdateWebsiteAboutDto) {
    return this.websiteService.updateAbout(dto);
  }
}
