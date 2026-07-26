import type { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../../utils/app-error.js";
import { findUserById } from "../user/core/index.js";

export function requireAdmin(requiredRole?: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.sub) {
        return next(new UnauthorizedError("Authentication token required"));
      }

      const user = await findUserById(req.user.sub);
      if (!user) {
        return next(new UnauthorizedError("User profile not found"));
      }

      const role = user.role || "user";
      const isAdmin = role === "admin" || role === "super_admin";

      if (!isAdmin) {
        return next(new ForbiddenError("Access denied: Elevated administrator privileges required"));
      }

      if (requiredRole && requiredRole === "super_admin" && role !== "super_admin") {
        return next(new ForbiddenError("Access denied: Super Admin authorization required"));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
