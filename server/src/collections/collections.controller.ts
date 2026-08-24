import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CollectionResponseDto } from './dto/collection-response.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * CollectionsController — the storefront's editorial collections. `GET /` is a
 * public read (the storefront's "Shop by mood" + /collections pages consume it);
 * the rest are admin management routes.
 *
 * NOTE: write routes are UNGUARDED for now, matching the product/fabric write
 * routes (the admin still uses a mock auth session). Add JwtAuthGuard +
 * RolesGuard('admin') before any non-local deployment.
 */
@ApiTags('Collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /** List all collections (public read — storefront catalogue metadata). */
  @Get()
  @ApiOperation({ summary: 'List all collections (with product counts)' })
  @ApiOkResponse({ type: [CollectionResponseDto] })
  findAll(): Promise<CollectionResponseDto[]> {
    return this.collectionsService.findAll();
  }

  /** Idempotently seed the 6 shipped collections + backfill product membership. */
  @Post('seed')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: seed default collections (idempotent)' })
  @ApiOkResponse({ description: 'Seeded.' })
  seed(): Promise<{ created: number; slugs: string[] }> {
    return this.collectionsService.seed();
  }

  /** Fetch one collection by id (admin edit screen). */
  @Get(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Get a collection by id' })
  @ApiOkResponse({ type: CollectionResponseDto })
  findById(@Param('id') id: string): Promise<CollectionResponseDto> {
    return this.collectionsService.findById(id);
  }

  /** Create a collection. */
  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: create a collection' })
  @ApiCreatedResponse({ type: CollectionResponseDto })
  create(@Body() dto: CreateCollectionDto): Promise<CollectionResponseDto> {
    return this.collectionsService.create(dto);
  }

  /** Update a collection. */
  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update a collection' })
  @ApiOkResponse({ type: CollectionResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ): Promise<CollectionResponseDto> {
    return this.collectionsService.update(id, dto);
  }

  /** Delete a collection (drops its slug from any product's membership). */
  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: delete a collection' })
  @ApiOkResponse({ description: 'Deleted.' })
  remove(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.collectionsService.remove(id);
  }
}
