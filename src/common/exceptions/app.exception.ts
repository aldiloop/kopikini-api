import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiFieldError } from '../response/api-response.types';

/**
 * Exception aplikasi dengan daftar error per-field (format error TRD §4.1).
 * Gunakan factory statis agar pesan konsisten.
 */
export class AppException extends HttpException {
  constructor(status: HttpStatus, message: string, errors: ApiFieldError[] = []) {
    super({ message, errors }, status);
  }

  static badRequest(message: string, errors: ApiFieldError[] = []) {
    return new AppException(HttpStatus.BAD_REQUEST, message, errors);
  }

  static unauthorized(message = 'Unauthorized', errors: ApiFieldError[] = []) {
    return new AppException(HttpStatus.UNAUTHORIZED, message, errors);
  }

  static notFound(message: string, errors: ApiFieldError[] = []) {
    return new AppException(HttpStatus.NOT_FOUND, message, errors);
  }

  static unprocessable(message: string, errors: ApiFieldError[] = []) {
    return new AppException(HttpStatus.UNPROCESSABLE_ENTITY, message, errors);
  }

  static tooManyRequests(message: string, errors: ApiFieldError[] = []) {
    return new AppException(HttpStatus.TOO_MANY_REQUESTS, message, errors);
  }
}
