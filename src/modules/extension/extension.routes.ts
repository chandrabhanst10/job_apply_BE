import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  generatePairingPin,
  pairWithPin,
  pairExtension,
  syncCookies,
  getExtensionStatus,
  heartbeat,
  disconnectExtension
} from "./extension.controller.js";

export const extensionRouter = Router();

// Public extension endpoint to redeem 6-digit PIN for session token
extensionRouter.post("/pair-with-pin", pairWithPin);

// Authenticated user endpoints
extensionRouter.use(authenticate);
extensionRouter.post("/pairing-pin", generatePairingPin);
extensionRouter.post("/pair", pairExtension);
extensionRouter.post("/sync-cookies", syncCookies);
extensionRouter.get("/status", getExtensionStatus);
extensionRouter.post("/heartbeat", heartbeat);
extensionRouter.post("/disconnect", disconnectExtension);
