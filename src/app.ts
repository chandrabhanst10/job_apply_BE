import crypto from "node:crypto";
import express from "express";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { openApiSpec } from "./docs/openapi.js";
import { applySecurity, csrfProtection } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiRouter } from "./routes/index.js";
import { sendSuccess } from "./utils/response.js";
import { HttpStatus } from "./constants/http.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, _res, next) => {
    req.requestId = crypto.randomUUID();
    next();
  });
  const httpLogger = pinoHttp as unknown as (options: { logger: typeof logger }) => express.RequestHandler;
  app.use(httpLogger({ logger }));
  applySecurity(app);
  app.get("/health", (_req, res) => sendSuccess(res, HttpStatus.OK, "Service healthy", { uptime: process.uptime() }));
  app.get(["/csrf-token", `${env.API_PREFIX}/csrf-token`], csrfProtection, (req, res) => sendSuccess(res, HttpStatus.OK, "CSRF token issued", { csrfToken: req.cookies.csrfToken }));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use(env.API_PREFIX, csrfProtection, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
