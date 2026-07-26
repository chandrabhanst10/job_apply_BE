import fs from "node:fs";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase } from "./database/mongoose.js";
import { createApp } from "./app.js";
import "./jobs/apply.worker.js";
import { runAutopilotCrawl } from "./jobs/scrape.worker.js";
import { runFeedScannerCrawl } from "./jobs/feed-scanner.worker.js";
import { promptService } from "./modules/prompt/prompt.service.js";

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

await connectDatabase();
await promptService.seedDefaultPrompts();

const server = createApp().listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "API server listening");
});

// Continuous 24/7 AI Background Scan Pipeline (Starts 3s after boot)
setTimeout(() => {
  runAutopilotCrawl().catch((err) => logger.error({ err }, "Autopilot initial crawl failed"));
  runFeedScannerCrawl().catch((err) => logger.error({ err }, "Feed scanner initial crawl failed"));
}, 3000);

// Continuous 24/7 loop running every 5 minutes completely automatically
const CRAWL_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  runAutopilotCrawl().catch((err) => logger.error({ err }, "Autopilot continuous crawl failed"));
  runFeedScannerCrawl().catch((err) => logger.error({ err }, "Feed scanner continuous crawl failed"));
}, CRAWL_INTERVAL);

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down");
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
