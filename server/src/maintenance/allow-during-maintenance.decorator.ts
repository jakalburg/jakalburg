import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_MAINTENANCE = 'allowDuringMaintenance';

/**
 * Marks a route as reachable while maintenance mode is on.
 *
 * Use sparingly. It exists for the handful of routes that maintenance mode
 * would otherwise make it impossible to recover from — admin sign-in, the
 * status read the maintenance page itself depends on — not as a way to keep
 * convenient endpoints working.
 *
 * Every `@AdminOnly()` route is allowed automatically (see MaintenanceGuard),
 * so admin controllers never need this.
 */
export const AllowDuringMaintenance = () =>
  SetMetadata(ALLOW_DURING_MAINTENANCE, true);
