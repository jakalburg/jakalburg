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
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminResponseDto } from './dto/admin-response.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

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

  /** List all admins. */
  @Get('staff')
  @ApiOperation({ summary: 'Admin: list all administrators' })
  @ApiOkResponse({ type: [AdminResponseDto] })
  findAll() {
    return this.adminService.findAll();
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
