import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

export async function connectDatabase(uri = env.MONGO_URI): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { autoIndex: env.NODE_ENV !== "production" });
  logger.info("MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
