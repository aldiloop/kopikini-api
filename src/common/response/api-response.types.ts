/** Unified Response Envelope sesuai TRD §4.1. */
export const API_VERSION = 'v1';

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta: { timestamp: string; version: string };
}

export interface ApiFieldError {
  field: string;
  issue: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors: ApiFieldError[];
}
