import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  getProfile,
  updateProfile,
  deleteAccount,
  uploadProfileImage,
  getAutopilot,
  updateAutopilot,
  suggestAutopilotCriteria,
  getAiConfig,
  updateAiConfig,
  resetAiPrompts,
  testAiPrompt
} from "./controller.js";
import { updateProfileSchema, updateAutopilotSchema } from "./validation.js";

const imageUpload = multer({ dest: env.UPLOAD_DIR, limits: { fileSize: 2 * 1024 * 1024 } });
export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get("/profile", getProfile);
userRouter.patch("/profile", validate(updateProfileSchema), updateProfile);
userRouter.delete("/profile", deleteAccount);
userRouter.post("/profile/image", imageUpload.single("image"), uploadProfileImage);
userRouter.get("/autopilot/:platform", getAutopilot);
userRouter.patch("/autopilot/:platform", validate(updateAutopilotSchema), updateAutopilot);
userRouter.post("/autopilot/suggest", suggestAutopilotCriteria);

// AI Configuration endpoints
userRouter.get("/ai-config", getAiConfig);
userRouter.patch("/ai-config", updateAiConfig);
userRouter.post("/ai-config/reset-prompts", resetAiPrompts);
userRouter.post("/ai-config/test-prompt", testAiPrompt);
