import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { getMySubscription } from "./subscription.controller.js";

export const subscriptionRouter = Router();

subscriptionRouter.use(authenticate);
subscriptionRouter.get("/me", getMySubscription);
