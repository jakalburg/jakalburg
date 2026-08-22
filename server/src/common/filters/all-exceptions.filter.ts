import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { extractRequestId } from '../utils/request-context.util';

/**
 * Global exception filter. Keeps the kaybykhushie response shape (adds a
 * `requestId` to every error body) but drops the ErrorLog DB dependency
 * (Nest Logger only). Re-introduce an error-log module if/when it is ported.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = extractRequestId(request) || 'unknown';

    let body: Record<string, unknown>;
    if (isHttpException) {
      const httpResponse = (exception as HttpException).getResponse();
      body =
        typeof httpResponse === 'object' && httpResponse !== null
          ? { ...(httpResponse as Record<string, unknown>), requestId }
          : { statusCode: status, message: httpResponse, requestId };
    } else {
      // Never leak internal error details to the client.
      body = {
        statusCode: status,
        message: 'Internal server error',
        requestId,
      };
    }

    response.status(status).json(body);

    // Only log genuinely unexpected errors (5xx / non-HttpException).
    if (status >= 500 || !isHttpException) {
      const err = exception as any;
      this.logger.error(
        `[${requestId}] ${request.method} ${request.originalUrl} -> ${status}: ${err?.message}`,
        err?.stack,
      );
    }
  }
}
