import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

/**
 * Admin-only route protection. Requires a valid JWT (JwtAuthGuard populates
 * `req.user` from the DB, incl. `role`) AND `role === 'admin'` (RolesGuard reads
 * the `@Roles('admin')` metadata this sets).
 *
 * Apply at CLASS level to lock down an entire admin controller, or at METHOD
 * level for the admin routes on a controller that also serves public reads
 * (products, fabrics, collections, website). The Swagger decorators just document
 * the 401/403 the guards can now return.
 */
export function AdminOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('admin'),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' }),
    ApiForbiddenResponse({ description: 'Authenticated but not an admin.' }),
  );
}
