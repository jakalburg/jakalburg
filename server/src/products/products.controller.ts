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
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import {
  AdminProductListResponseDto,
  AdminProductResponseDto,
  ProductFacetsResponseDto,
  ProductListResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import {
  BulkProductStatusDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/update-product.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ===========================================================================
  // Admin catalogue (read). Declared BEFORE the public `:slug` routes so the
  // literal `admin/*` segments win over the `:slug` catch-all.
  //
  // GUARDED: each admin route carries @AdminOnly() (valid admin JWT required).
  // The public storefront reads below stay open.
  // ===========================================================================

  /** Paginated admin list (includes hidden products). */
  @Get('admin/list')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: list products (paginated, includes hidden)' })
  @ApiOkResponse({ type: AdminProductListResponseDto })
  adminList(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
  ): Promise<AdminProductListResponseDto> {
    // Raw strings are handed straight to parsePagination, which clamps and
    // normalises them (page ≥ 1, 1 ≤ limit ≤ 100) rather than trusting Number().
    return this.productsService.adminList({
      skip,
      take,
      page,
      limit,
      status,
      search,
      category,
      sort,
    });
  }

  /** Admin free-text search. */
  @Get('admin/search')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: search products' })
  @ApiOkResponse({ type: AdminProductListResponseDto })
  adminSearch(
    @Query('query') query = '',
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
  ): Promise<AdminProductListResponseDto> {
    return this.productsService.adminSearch(query, {
      skip,
      take,
      page,
      limit,
      status,
      category,
      sort,
    });
  }

  /** Admin: fetch a single product by id (visible or hidden). */
  @Get('admin/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: get a product by id' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  adminFindById(@Param('id') id: string): Promise<AdminProductResponseDto> {
    return this.productsService.adminFindById(id);
  }

  // ===========================================================================
  // Public storefront (read)
  // ===========================================================================

  /** List / filter products (public, paginated). */
  @Get()
  @ApiOperation({
    summary: 'List products (paginated)',
    description:
      'Returns one page of products with optional filters (gender, category, ' +
      'collection, isNew, onSale, essential, size, color, ids, search) and ' +
      'sort. Defaults to page 1 × 10 rows; `limit` is capped at 100.',
  })
  @ApiOkResponse({ description: 'Matching products.', type: ProductListResponseDto })
  findAll(@Query() query: ProductQueryDto): Promise<ProductListResponseDto> {
    return this.productsService.findAll(query);
  }

  /**
   * Distinct category slugs. Literal `meta/*` path so it wins over the
   * `:slug` catch-all below.
   *
   * Bare: the whole catalogue, for the admin category picker.
   * With `?gender=`: only the categories that have live products for that
   * gender — what the storefront nav lists, so it can't link to an empty page.
   */
  @Get('meta/categories')
  @ApiOperation({ summary: 'List distinct product categories' })
  @ApiOkResponse({ description: 'Distinct category slugs.', type: [String] })
  listCategories(@Query() query: CategoryQueryDto): Promise<string[]> {
    return this.productsService.listCategories(query.gender);
  }

  /**
   * Distinct sizes + colours across everything matching the given filters.
   * The storefront's filter chips read this, since a paginated list no longer
   * holds the whole matching set client-side.
   */
  @Get('meta/facets')
  @ApiOperation({ summary: 'Distinct sizes + colours for a filtered slice' })
  @ApiOkResponse({ description: 'Available filter values.', type: ProductFacetsResponseDto })
  listFacets(@Query() query: ProductQueryDto): Promise<ProductFacetsResponseDto> {
    return this.productsService.listFacets(query);
  }

  /** Related products for a slug (public). */
  @Get(':slug/related')
  @ApiOperation({ summary: 'Get related products for a slug' })
  @ApiOkResponse({ description: 'Related products.', type: [ProductResponseDto] })
  @ApiNotFoundResponse({ description: 'No product with that slug.' })
  findRelated(@Param('slug') slug: string): Promise<ProductResponseDto[]> {
    return this.productsService.findRelated(slug);
  }

  /** Fetch a single product by slug (public). */
  @Get(':slug')
  @ApiOperation({ summary: 'Get a product by slug' })
  @ApiOkResponse({ description: 'The product.', type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'No product with that slug.' })
  findOne(@Param('slug') slug: string): Promise<ProductResponseDto> {
    return this.productsService.findBySlug(slug);
  }

  // ===========================================================================
  // Admin catalogue (write). Each route is @AdminOnly() — see note above.
  // ===========================================================================

  /** Create a product. */
  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: create a product' })
  @ApiCreatedResponse({ type: AdminProductResponseDto })
  create(@Body() dto: CreateProductDto): Promise<AdminProductResponseDto> {
    return this.productsService.create(dto);
  }

  /** Bulk enable/disable. Declared before `:id` so `bulk-status` isn't read as an id. */
  @Patch('bulk-status')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: bulk enable/disable products' })
  bulkStatus(@Body() dto: BulkProductStatusDto): Promise<{ count: number }> {
    return this.productsService.bulkUpdateStatus(dto.productIds, dto.isActive);
  }

  /** Toggle a single product's visibility. */
  @Patch(':id/status')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: toggle product visibility' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
  ): Promise<AdminProductResponseDto> {
    return this.productsService.updateStatus(id, dto.isActive);
  }

  /** Update a product. */
  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update a product' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<AdminProductResponseDto> {
    return this.productsService.update(id, dto);
  }

  /** Delete a product. */
  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: delete a product' })
  @ApiOkResponse({ description: 'Deleted.' })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  remove(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.productsService.remove(id);
  }
}
