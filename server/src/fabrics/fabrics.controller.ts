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
import { FabricsService } from './fabrics.service';
import { CreateFabricDto } from './dto/create-fabric.dto';
import { UpdateFabricDto } from './dto/update-fabric.dto';
import { FabricResponseDto } from './dto/fabric-response.dto';

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

  /** List all fabrics (public read — harmless catalogue metadata). */
  @Get()
  @ApiOperation({ summary: 'List all fabrics' })
  @ApiOkResponse({ type: [FabricResponseDto] })
  findAll(): Promise<FabricResponseDto[]> {
    return this.fabricsService.findAll();
  }

  /** Create a fabric. */
  @Post()
  @ApiOperation({ summary: 'Admin: create a fabric' })
  @ApiCreatedResponse({ type: FabricResponseDto })
  create(@Body() dto: CreateFabricDto): Promise<FabricResponseDto> {
    return this.fabricsService.create(dto);
  }

  /** Update a fabric. */
  @Patch(':id')
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
  @ApiOperation({ summary: 'Admin: delete a fabric' })
  @ApiOkResponse({ description: 'Deleted.' })
  remove(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.fabricsService.remove(id);
  }
}
