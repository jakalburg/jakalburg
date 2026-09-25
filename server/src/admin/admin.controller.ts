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
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { PaginationQueryDto } from '../common/pagination';

/**
 * AdminController — administrator ("staff") management for the admin app's
 * /admin-staff pages. Routes live under /admin/staff to match the admin
 * frontend's API_ENDPOINTS.admin.
 *
 * NOTE: these routes are UNGUARDED for now, matching the product / fabric write
 * routes (the admin still uses a mock auth session, and realApi sends no JWT).
 * They create PRIVILEGED accounts, so add JwtAuthGuard + RolesGuard('admin')
 * before any non-local deployment — this is the highest-priority route to
 * protect.
 *
 * GUARDED: class-level @AdminOnly() — every route requires a valid admin JWT.
 */
@ApiTags('Admin')
@AdminOnly()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** One page of admins. */
  @Get('staff')
  @ApiOperation({
    summary: 'Admin: list administrators (paginated)',
    description: 'Defaults to page 1 × 10 admins; `limit` is capped at 100.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Free text over name and email.',
  })
  @ApiOkResponse({ description: 'Paged administrators envelope.' })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAll({ ...pagination, search });
  }

  /** Fetch one admin by id. */
  @Get('staff/:id')
  @ApiOperation({ summary: 'Admin: get an administrator by id' })
  @ApiOkResponse({ type: AdminResponseDto })
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  /** Create a new admin account. */
  @Post('staff')
  @ApiOperation({ summary: 'Admin: create an administrator' })
  @ApiCreatedResponse({ type: AdminResponseDto })
  create(@Body() dto: CreateAdminDto) {
    return this.adminService.create(dto);
  }

  /** Update an admin's details. */
  @Patch('staff/:id')
  @ApiOperation({ summary: 'Admin: update an administrator' })
  @ApiOkResponse({ type: AdminResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.update(id, dto);
  }

  /** Delete an admin. */
  @Delete('staff/:id')
  @ApiOperation({ summary: 'Admin: delete an administrator' })
  @ApiOkResponse({ description: 'Deleted.' })
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
