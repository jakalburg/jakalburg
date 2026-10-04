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
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { PaginationQueryDto } from '../common/pagination';

/**
 * PagesController — the storefront's editable static pages (Shipping, Returns,
 * Privacy, Terms, FAQ), backing the admin's Website → Static Pages screen.
 *
 * Reads are PUBLIC (the storefront renders them); every write is @AdminOnly().
 *
 * Route order matters: the static 'all' and 'slug/:slug' segments are declared
 * before the catch-all ':id' so they are matched first.
 */
@ApiTags('Pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  /** Public: every active page. */
  @Get()
  @ApiOperation({ summary: 'Public: list active static pages' })
  findPublished() {
    return this.pagesService.findPublished();
  }

  /** Admin: pages including inactive drafts, one page at a time. */
  @Get('all')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: list static pages (paginated)',
    description:
      'Defaults to page 1 × 10; `limit` is capped at 100. `search` matches ' +
      'title and slug.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Free text over title and slug.' })
  @ApiOkResponse({ description: 'Paged pages, including inactive drafts.' })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
  ) {
    return this.pagesService.findAll({ ...pagination, search });
  }

  /** Public: one page by slug — the slug matches the storefront route. */
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Public: get a static page by slug' })
  @ApiOkResponse({ description: 'The page. 404 when missing or inactive.' })
  findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }

  /** Admin: create any missing default page; never overwrites an edited one. */
  @Post('seed')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: seed the default static pages' })
  seed() {
    return this.pagesService.seedDefaults();
  }

  /** Admin: one page by id (the edit form loads this). */
  @Get(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: get a static page by id' })
  findOne(@Param('id') id: string) {
    return this.pagesService.findOne(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: create a static page' })
  create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update a static page' })
  update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: delete a static page' })
  remove(@Param('id') id: string) {
    return this.pagesService.remove(id);
  }
}
