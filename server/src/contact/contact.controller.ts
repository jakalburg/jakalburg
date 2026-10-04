import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactStatusDto } from './dto/contact.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { PaginationQueryDto } from '../common/pagination';

/**
 * ContactController — storefront submissions + the admin Contact inbox.
 *
 * POST is PUBLIC (the storefront contact form and newsletter signup post here,
 * unauthenticated) and rate-limited to blunt spam. Every read/write after it is
 * @AdminOnly() — the inbox is admin-only, so the guard sits on each method
 * rather than the class.
 */
@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /** Public: a storefront contact-form or newsletter submission. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Public: submit a contact form / newsletter signup' })
  @ApiOkResponse({ description: 'The stored submission.' })
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  /** Admin: one inbox (submissions of a given `type`), newest-first, paginated. */
  @Get()
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: list submissions (paginated)',
    description: 'Defaults to page 1 × 10; `limit` is capped at 100.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['contact_us', 'newsletter'],
    description: 'Filter to one inbox. Omit for everything.',
  })
  @ApiOkResponse({ description: 'Paged submissions, newest-first.' })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('type') type?: string,
  ) {
    return this.contactService.findAll({ ...pagination, type });
  }

  /** Admin: a single submission. */
  @Get(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: get one submission' })
  @ApiOkResponse({ description: 'The submission.' })
  findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  /** Admin: mark a submission read / unread. */
  @Patch(':id/status')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: mark a submission read/unread' })
  @ApiOkResponse({ description: 'The updated submission.' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateContactStatusDto: UpdateContactStatusDto,
  ) {
    return this.contactService.updateStatus(id, updateContactStatusDto);
  }

  /** Admin: delete a submission. */
  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: delete a submission' })
  @ApiOkResponse({ description: 'Deleted.' })
  remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
