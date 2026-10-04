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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { PaginationQueryDto } from '../common/pagination';

/**
 * Catalog → Categories.
 *
 * Reads are public (the storefront may want the artwork and copy); every write
 * is @AdminOnly. The admin list is a separate route because it includes
 * inactive rows and product counts, neither of which a shopper should see.
 */
@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Public: active categories, in nav order. */
  @Get()
  @ApiOperation({ summary: 'Public: active categories' })
  findPublic() {
    return this.categories.findPublic();
  }

  /**
   * Admin list. Seeds from the catalogue on first read so the screen opens
   * populated rather than looking empty next to a catalogue that plainly has
   * categories — see CategoriesService.seedFromProducts (idempotent).
   */
  @Get('admin/list')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: categories with product counts (paginated)',
    description:
      'Defaults to page 1 × 10; `limit` is capped at 100. `search` matches ' +
      'name and slug across the whole table, not just the current page.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Free text over name and slug.' })
  @ApiQuery({
    name: 'seed',
    required: false,
    description: "Pass 'false' to skip the first-read seed from the catalogue.",
  })
  @ApiOkResponse({ description: 'Paged categories, including inactive ones.' })
  async adminList(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('seed') seed?: string,
  ) {
    if (seed !== 'false') await this.categories.seedFromProducts();
    return this.categories.findAllPaged({ ...pagination, search });
  }

  /**
   * The product form's dropdown: managed categories merged with everything
   * already in use, so nothing an admin has typed can vanish from the picker.
   */
  @Get('picker')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: category slugs for the product form' })
  @ApiOkResponse({ description: 'Sorted slugs.', type: [String] })
  picker() {
    return this.categories.listForPicker();
  }

  @Post('seed')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: create rows for categories already in use' })
  seed() {
    return this.categories.seedFromProducts();
  }

  @Get(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: one category' })
  findOne(@Param('id') id: string) {
    return this.categories.findOne(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: create a category' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update a category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: delete an unused category' })
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
