import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import xss from "xss";
import type { Express } from "express";
import { env, isProduction } from "../config/env.js";
import { ForbiddenError } from "../utils/app-error.js";

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return xss(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeValue(item)]));
  }
  return value;
}

export function xssProtection(req: Request, _res: Response, next: NextFunction): void {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query) as Request["query"];
  req.params = sanitizeValue(req.params) as Request["params"];
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  if (safeMethods.has(req.method)) {
    if (!req.cookies.csrfToken) {
      res.cookie("csrfToken", crypto.randomBytes(24).toString("hex"), {
        httpOnly: false,
        secure: isProduction || env.COOKIE_SECURE,
        sameSite: "lax"
      });
    }
    next();
    return;
  }
  if (req.headers.authorization?.startsWith("Bearer ") || (!req.cookies.accessToken && !req.cookies.refreshToken)) {
    next();
    return;
  }
  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers["x-csrf-token"];
  if (cookieToken && headerToken && cookieToken === headerToken) {
    next();
    return;
  }
  next(new ForbiddenError("Invalid CSRF token"));
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Please try again after 15 minutes." }
});

export const pairingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many extension pairing attempts. Please try again after 15 minutes." }
});

export function applySecurity(app: Express): void {
  app.use(helmet());

  const originsFromEnv = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const allowedOriginsSet = new Set([env.CLIENT_URL, ...originsFromEnv]);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOriginsSet.has(origin) || origin.startsWith("chrome-extension://")) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"]
    })
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(mongoSanitize());
  app.use(hpp());
  app.use(xssProtection);
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path.startsWith("/health")
    })
  );
}

