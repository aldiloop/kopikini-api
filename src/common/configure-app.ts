import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from './exceptions/app.exception';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ApiFieldError } from './response/api-response.types';
import { ApiResponseInterceptor } from './response/api-response.interceptor';

export const API_PREFIX = 'api/v1';

function flattenValidationErrors(errors: ValidationError[], parent = ''): ApiFieldError[] {
  return errors.flatMap((err) => {
    const field = parent ? `${parent}.${err.property}` : err.property;
    const own = Object.values(err.constraints ?? {}).map((issue) => ({ field, issue }));
    return [...own, ...flattenValidationErrors(err.children ?? [], field)];
  });
}

/**
 * Konfigurasi global aplikasi: prefix `/api/v1`, validasi DTO ketat (TRD §6.3),
 * envelope respons dan filter error (TRD §4.1). Dipakai oleh main.ts dan test e2e
 * supaya perilaku yang diuji identik dengan produksi.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        AppException.badRequest('Validation failed', flattenValidationErrors(errors)),
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());
  return app;
}
