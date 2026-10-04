import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { MaintenanceService } from './maintenance.service';
import { ALLOW_DURING_MAINTENANCE } from './allow-during-maintenance.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/** Header the storefront sends to present a preview token on API calls. */
export const PREVIEW_HEADER = 'x-maintenance-preview';

/** Hint to clients (and crawlers) for when to come back, in seconds. */
const RETRY_AFTER_SECONDS = 3600;

/**
 * MaintenanceGuard — global. Returns 503 for storefront traffic while
 * maintenance mode is on, so the switch is real rather than cosmetic: a direct
 * API call, a stale browser tab left open from before the switch was flipped,
 * and a scripted checkout are all refused alike.
 *
 * THREE THINGS ALWAYS GET THROUGH, or there would be no way back out:
 *   1. every @AdminOnly() route — the admin has to keep working to turn this
 *      off. Detected from the `@Roles('admin')` metadata the decorator sets,
 *      so a new admin route is covered the moment it's written.
 *   2. anything explicitly marked @AllowDuringMaintenance() — admin sign-in,
 *      and the status read the maintenance page itself needs.
 *   3. a request presenting a VALID preview token.
 *
 * On the token: it is verified server-side against a stored SHA-256 hash with
 * a constant-time compare, on every request. Nothing the browser sends is
 * trusted by itself — there is no "I'm allowed" cookie to forge, and without
 * the real 256-bit token a visitor gets a 503 like everyone else.
 *
 * Runs BEFORE the auth guards, so it never depends on a session being
 * resolved. 503 (not 403) is deliberate: it tells crawlers the outage is
 * temporary, so the shop isn't deindexed over a maintenance window.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly maintenance: MaintenanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const targets = [context.getHandler(), context.getClass()];

    const explicitlyAllowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_DURING_MAINTENANCE,
      targets,
    );
    if (explicitlyAllowed) return true;

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    if (roles?.includes('admin')) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const presented = this.extractToken(request);

    if (!(await this.maintenance.shouldBlock(presented))) return true;

    const response = context.switchToHttp().getResponse();
    response?.setHeader?.('Retry-After', String(RETRY_AFTER_SECONDS));

    throw new ServiceUnavailableException({
      statusCode: 503,
      error: 'Service Unavailable',
      maintenance: true,
      message:
        'The store is temporarily closed for maintenance. Please try again shortly.',
    });
  }

  /**
   * A preview token may arrive as a header (the storefront's own API calls) or
   * as a query parameter (someone opening the preview link directly). Both are
   * verified the same way; neither is trusted without verification.
   */
  private extractToken(request: Request): string | undefined {
    const header = request.headers?.[PREVIEW_HEADER];
    if (typeof header === 'string' && header) return header;
    if (Array.isArray(header) && header[0]) return header[0];

    const query = request.query?.preview;
    if (typeof query === 'string' && query) return query;

    return undefined;
  }
}
