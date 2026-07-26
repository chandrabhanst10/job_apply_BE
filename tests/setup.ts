import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll } from "vitest";

process.env.NODE_ENV = "test";
process.env.PORT = "4010";
process.env.API_PREFIX = "/api/v1";
process.env.APP_URL = "http://localhost:4010";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test-placeholder";
process.env.JWT_ACCESS_SECRET = "test-access-secret-with-at-least-32-chars";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";
process.env.JWT_EMAIL_SECRET = "test-email-secret-with-at-least-32-chars";
process.env.JWT_PASSWORD_RESET_SECRET = "test-reset-secret-with-at-least-32-chars";
process.env.ACCESS_TOKEN_TTL = "15m";
process.env.REFRESH_TOKEN_TTL_DAYS = "7";
process.env.COOKIE_SECURE = "false";
process.env.UPLOAD_DIR = path.join(os.tmpdir(), "job-apply-api-tests");
process.env.MAX_UPLOAD_MB = "10";
process.env.RATE_LIMIT_WINDOW_MS = "900000";
process.env.RATE_LIMIT_MAX = "1000";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  fs.mkdirSync(process.env.UPLOAD_DIR as string, { recursive: true });
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
