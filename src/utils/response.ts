import type { Response } from "express";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: unknown[];
}

export function sendSuccess<T>(res: Response, statusCode: number, message: string, data: T): Response<ApiResponse<T>> {
  return res.status(statusCode).json({ success: true, message, data, errors: [] });
}

export function sendError(res: Response, statusCode: number, message: string, errors: unknown[] = []): Response<ApiResponse<null>> {
  return res.status(statusCode).json({ success: false, message, data: null, errors });
}
