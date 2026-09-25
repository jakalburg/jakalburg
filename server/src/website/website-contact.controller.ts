import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebsiteService } from './website.service';
import { UpdateWebsiteContactDto } from './dto/update-website-contact.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * WebsiteContactController — the storefront Contact page content.
 *
 * GET is PUBLIC (the /contact page renders these details). PATCH is @AdminOnly()
 * and backs the admin's Website → Contact Page tab. Split from
 * WebsiteController because a controller has a single base path.
 */
@ApiTags('Website')
@Controller('website/contact')
export class WebsiteContactController {
  constructor(private readonly websiteService: WebsiteService) {}

  /** Public: the Contact page content (singleton). */
  @Get()
  @ApiOperation({ summary: 'Public: contact page content' })
  @ApiOkResponse({ description: 'Contact details + page copy.' })
  getContact() {
    return this.websiteService.getContact();
  }

  /** Admin: update the Contact page content. */
  @Patch()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update contact page content' })
  @ApiOkResponse({ description: 'The updated content.' })
  updateContact(@Body() dto: UpdateWebsiteContactDto) {
    return this.websiteService.updateContact(dto);
  }
}
