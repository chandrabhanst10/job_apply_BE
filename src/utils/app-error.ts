import { HttpStatus } from "../constants/http.js";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors: unknown[] = [],
    public readonly isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", errors: unknown[] = []) {
    super(HttpStatus.BAD_REQUEST, message, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(HttpStatus.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(HttpStatus.FORBIDDEN, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(HttpStatus.NOT_FOUND, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(HttpStatus.CONFLICT, message);
  }
}
