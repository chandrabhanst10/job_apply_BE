import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./feed-scanner.controller.js";
import { updateSettingsSchema } from "./validation.js";

export const feedScannerRouter = Router();

feedScannerRouter.use(authenticate);
feedScannerRouter.get("/posts", controller.getPosts);
feedScannerRouter.get("/opportunities", controller.getOpportunities);
feedScannerRouter.post("/scan", controller.triggerScan);
feedScannerRouter.post("/opportunities/:id/apply", controller.applyToOpportunity);
feedScannerRouter.patch("/settings", validate(updateSettingsSchema), controller.updateSettings);
