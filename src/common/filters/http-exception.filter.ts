import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorResponse, ApiFieldError } from '../response/api-response.types';

/** Mengubah semua exception menjadi format error TRD §4.1. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: ApiFieldError[] = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as { message?: unknown; errors?: unknown };
        if (typeof b.message === 'string') message = b.message;
        else if (Array.isArray(b.message)) {
          message = 'Validation failed';
          errors = b.message.map((issue) => ({ field: '_', issue: String(issue) }));
        }
        if (Array.isArray(b.errors)) errors = b.errors as ApiFieldError[];
      }
    } else {
      // Jangan bocorkan detail internal (stack, SQL) ke klien.
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const payload: ApiErrorResponse = { success: false, statusCode, message, errors };
    res.status(statusCode).json(payload);
  }
}
