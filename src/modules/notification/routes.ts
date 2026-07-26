import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { notificationService } from "./service.js";

export const notificationRouter = Router();

notificationRouter.get("/stream", authenticate, (req, res) => {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized connection attempt" });
    return;
  }
  notificationService.subscribe(userId, res);
});
