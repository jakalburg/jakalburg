import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebsiteService } from './website.service';
import { UpdateHomeSectionDto } from './dto/update-home-section.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * WebsiteController — the admin's Home Setup tab (list + edit + seed) and the
 * storefront's public hero read.
 *
 * Static segments ('all', 'hero', 'public', 'seed') can't collide with the `:id` PATCH
 * (different HTTP verbs / distinct paths), so no route-ordering care is needed.
 *
 * NOTE: the write routes (PATCH :id, POST seed) are UNGUARDED for now, matching
 * the other admin write routes (mock auth, realApi sends no JWT). Add
 * JwtAuthGuard + RolesGuard('admin') before any non-local deployment.
 */
@ApiTags('Website')
@Controller('website/home-sections')
export class WebsiteController {
  constructor(private readonly websiteService: WebsiteService) {}

  /** Admin: every section (incl. disabled), ordered. */
  @Get('all')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: list all home sections' })
  findAll() {
    return this.websiteService.findAllSections();
  }

  /** Public: the enabled hero slider config (slides + fullBleed) for the store. */
  @Get('hero')
  @ApiOperation({ summary: 'Public: hero slider config' })
  @ApiOkResponse({
    description:
      '{ fullBleed, slides }. slides is [] when the hero is missing/disabled.',
  })
  getHero() {
    return this.websiteService.getHeroConfig();
  }

  /** Public: every enabled section, ordered — the storefront's whole home page. */
  @Get('public')
  @ApiOperation({ summary: 'Public: enabled home sections, ordered' })
  @ApiOkResponse({
    description:
      'The enabled sections in render order. Includes the Footer row, whose ' +
      '`data` carries the site-wide footer background images.',
  })
  getPublicSections() {
    return this.websiteService.getPublicSections();
  }

  /** Admin: sync the stored sections to the canonical list (adds + prunes). */
  @Post('seed')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: sync home sections to the canonical list' })
  seed() {
    return this.websiteService.seedDefaults();
  }

  /** Admin: patch a section (inline edits, toggles, or its `data` blob). */
  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update a home section' })
  update(@Param('id') id: string, @Body() dto: UpdateHomeSectionDto) {
    return this.websiteService.updateSection(id, dto);
  }
}
