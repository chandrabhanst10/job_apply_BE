import pino from "pino";
import { env, isTest } from "./env.js";

export const logger = pino({
  level: isTest ? "silent" : process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.cookie", "password", "token", "refreshToken"]
});
