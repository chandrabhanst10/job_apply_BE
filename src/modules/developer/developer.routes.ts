import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { createApiKey, getApiKeys, revokeApiKey } from "./developer.controller.js";

export const developerRouter = Router();

developerRouter.use(authenticate);
developerRouter.post("/api-keys", createApiKey);
developerRouter.get("/api-keys", getApiKeys);
developerRouter.delete("/api-keys/:id", revokeApiKey);
