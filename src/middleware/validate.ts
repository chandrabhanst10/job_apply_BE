import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject } from "zod";
import { BadRequestError } from "../utils/app-error.js";

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      next(new BadRequestError("Validation failed", result.error.issues));
      return;
    }
    req.body = result.data.body ?? req.body;
    req.params = result.data.params ?? req.params;
    req.query = result.data.query ?? req.query;
    next();
  };
}
