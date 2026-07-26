import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import * as controller from "./automation.controller.js";

export const automationRouter = Router();

automationRouter.use(authenticate);
automationRouter.get("/history", controller.getHistory);
automationRouter.get("/stats", controller.getStats);
automationRouter.post("/crawl", controller.triggerCrawl);
