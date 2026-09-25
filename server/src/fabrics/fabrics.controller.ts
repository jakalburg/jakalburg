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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FabricsService } from './fabrics.service';
import { CreateFabricDto } from './dto/create-fabric.dto';
import { UpdateFabricDto } from './dto/update-fabric.dto';
import {
  FabricListResponseDto,
  FabricResponseDto,
} from './dto/fabric-response.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { PaginationQueryDto } from '../common/pagination';

/**
 * FabricsController — the curated fabric list the admin manages and the product
 * form picks from.
 *
 * NOTE: write routes are UNGUARDED for now, matching the product write routes
 * (the admin still uses a mock auth session). Add JwtAuthGuard +
 * RolesGuard('admin') before any non-local deployment.
 */
@ApiTags('Fabrics')
@Controller('fabrics')
export class FabricsController {
  constructor(private readonly fabricsService: FabricsService) {}

  /** List fabrics (public read — harmless catalogue metadata). */
  @Get()
  @ApiOperation({
    summary: 'List fabrics (paginated)',
    description: 'Defaults to page 1 × 10 fabrics; `limit` is capped at 100.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by name.' })
  @ApiOkResponse({ type: FabricListResponseDto })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
  ): Promise<FabricListResponseDto> {
    return this.fabricsService.findAll({ ...pagination, search });
  }

  /** Create a fabric. */
  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: create a fabric' })
  @ApiCreatedResponse({ type: FabricResponseDto })
  create(@Body() dto: CreateFabricDto): Promise<FabricResponseDto> {
    return this.fabricsService.create(dto);
  }

  /** Update a fabric. */
  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update a fabric' })
  @ApiOkResponse({ type: FabricResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFabricDto,
  ): Promise<FabricResponseDto> {
    return this.fabricsService.update(id, dto);
  }

  /** Delete a fabric. */
  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: delete a fabric' })
  @ApiOkResponse({ description: 'Deleted.' })
  remove(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.fabricsService.remove(id);
  }
}
