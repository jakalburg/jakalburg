import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Generates (or reuses an incoming) request id, exposes it on req.requestId
 * for handlers/filters, and echoes it back as X-Request-Id so clients can
 * correlate a failed call with a support report.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming ? incoming : randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
