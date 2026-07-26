import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpStatus } from "../constants/http.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";
import { sendError } from "../utils/response.js";

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, HttpStatus.NOT_FOUND, `Route ${req.originalUrl} not found`);
}

export function errorHandler(errVal: unknown, req: Request, res: Response, _next: NextFunction): void {
  const error = errVal as Error | AppError | ZodError;
  if (error instanceof AppError) {
    logger.warn({ err: error, requestId: req.requestId }, error.message);
    sendError(res, error.statusCode, error.message, error.errors);
    return;
  }
  if (error instanceof ZodError) {
    sendError(res, HttpStatus.BAD_REQUEST, "Validation failed", error.issues);
    return;
  }
  if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
    logger.warn({ err: error, requestId: req.requestId }, "Duplicate key error");
    sendError(res, HttpStatus.CONFLICT, "An account with this email address already exists.");
    return;
  }
  if (error && typeof error === "object" && "name" in error && (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError")) {
    logger.warn({ err: error, requestId: req.requestId }, "JWT validation failed");
    sendError(res, HttpStatus.UNAUTHORIZED, "Invalid or expired token");
    return;
  }
  const message = error instanceof Error ? error.message : String(errVal || "Unknown error");
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error({ err: errVal, requestId: req.requestId }, message);
  sendError(res, HttpStatus.INTERNAL_SERVER_ERROR, process.env.NODE_ENV === "development" ? message : "Internal server error", process.env.NODE_ENV === "development" && stack ? [stack] : []);
}
