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
import {
  AdminProductListResponseDto,
  AdminProductResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import {
  BulkProductStatusDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto/update-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ===========================================================================
  // Admin catalogue (read). Declared BEFORE the public `:slug` routes so the
  // literal `admin/*` segments win over the `:slug` catch-all.
  //
  // NOTE: unguarded for now so the admin UI (mock auth session) can call them.
  // Add JwtAuthGuard + RolesGuard('admin') before any non-local deployment.
  // ===========================================================================

  /** Paginated admin list (includes hidden products). */
  @Get('admin/list')
  @ApiOperation({ summary: 'Admin: list products (paginated, includes hidden)' })
  @ApiOkResponse({ type: AdminProductListResponseDto })
  adminList(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
  ): Promise<AdminProductListResponseDto> {
    return this.productsService.adminList({
      skip: skip !== undefined ? Number(skip) : undefined,
      take: take !== undefined ? Number(take) : undefined,
      status,
      search,
      category,
      sort,
    });
  }

  /** Admin free-text search. */
  @Get('admin/search')
  @ApiOperation({ summary: 'Admin: search products' })
  @ApiOkResponse({ type: AdminProductListResponseDto })
  adminSearch(
    @Query('query') query = '',
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<AdminProductListResponseDto> {
    return this.productsService.adminSearch(query, {
      skip: skip !== undefined ? Number(skip) : undefined,
      take: take !== undefined ? Number(take) : undefined,
    });
  }

  /** Admin: fetch a single product by id (visible or hidden). */
  @Get('admin/:id')
  @ApiOperation({ summary: 'Admin: get a product by id' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  adminFindById(@Param('id') id: string): Promise<AdminProductResponseDto> {
    return this.productsService.adminFindById(id);
  }

  // ===========================================================================
  // Public storefront (read)
  // ===========================================================================

  /** List / filter products (public). */
  @Get()
  @ApiOperation({
    summary: 'List products',
    description:
      'Returns products with optional filters (gender, category, collection, ' +
      'isNew, onSale, essential, search) and sort. With no query params it ' +
      'returns the full catalogue.',
  })
  @ApiOkResponse({ description: 'Matching products.', type: [ProductResponseDto] })
  findAll(@Query() query: ProductQueryDto): Promise<ProductResponseDto[]> {
    return this.productsService.findAll(query);
  }

  /**
   * Distinct category slugs across the catalogue. Literal `meta/*` path so it
   * wins over the `:slug` catch-all below. Feeds the admin category picker.
   */
  @Get('meta/categories')
  @ApiOperation({ summary: 'List distinct product categories' })
  @ApiOkResponse({ description: 'Distinct category slugs.', type: [String] })
  listCategories(): Promise<string[]> {
    return this.productsService.listCategories();
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
  // Admin catalogue (write). Unguarded for now — see note above.
  // ===========================================================================

  /** Create a product. */
  @Post()
  @ApiOperation({ summary: 'Admin: create a product' })
  @ApiCreatedResponse({ type: AdminProductResponseDto })
  create(@Body() dto: CreateProductDto): Promise<AdminProductResponseDto> {
    return this.productsService.create(dto);
  }

  /** Bulk enable/disable. Declared before `:id` so `bulk-status` isn't read as an id. */
  @Patch('bulk-status')
  @ApiOperation({ summary: 'Admin: bulk enable/disable products' })
  bulkStatus(@Body() dto: BulkProductStatusDto): Promise<{ count: number }> {
    return this.productsService.bulkUpdateStatus(dto.productIds, dto.isActive);
  }

  /** Toggle a single product's visibility. */
  @Patch(':id/status')
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
  @ApiOperation({ summary: 'Admin: delete a product' })
  @ApiOkResponse({ description: 'Deleted.' })
  @ApiNotFoundResponse({ description: 'No product with that id.' })
  remove(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.productsService.remove(id);
  }
}
