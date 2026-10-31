import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';
import { API_VERSION, ApiSuccessResponse } from './api-response.types';
import { RESPONSE_MESSAGE_KEY } from './response-message.decorator';

/** Membungkus semua respons sukses ke dalam envelope TRD §4.1. */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'OK';

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        statusCode: context.switchToHttp().getResponse<Response>().statusCode,
        message,
        data: (data ?? null) as T,
        meta: { timestamp: new Date().toISOString(), version: API_VERSION },
      })),
    );
  }
}
