import { Injectable, CanActivate } from '@nestjs/common';

/**
 * Kept for parity with the kaybykhushie reference, where the whole auth
 * controller sits behind this guard. Currently a no-op pass-through
 * (x-api-key is optional). Wire real key checks here later if needed.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
  