import type { Request } from 'express';

export function extractIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip || req.socket?.remoteAddress || undefined;
}

export function extractRequestId(req: Request): string | undefined {
  return (
    (req as any).requestId ||
    (typeof req.headers['x-request-id'] === 'string'
      ? (req.headers['x-request-id'] as string)
      : undefined)
  );
}
