import mongoose from "mongoose";
import type { ComponentHealthStatus } from "../types.js";

export async function checkDatabaseHealth(): Promise<ComponentHealthStatus> {
  try {
    const readyState = mongoose.connection.readyState;
    if (readyState === 1) {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
      return { status: "up", message: "MongoDB connection active and responding to ping." };
    }
    return { status: "down", message: `MongoDB state is ${readyState}` };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { status: "down", message: `MongoDB ping failed: ${errMsg}` };
  }
}
