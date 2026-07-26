import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { uploadResume } from "../../middleware/upload.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./controller.js";
import { resumeIdSchema } from "./validation.js";

export const resumeRouter = Router();

resumeRouter.use(authenticate);
resumeRouter.post("/", uploadResume.single("resume"), controller.uploadResumeController);
resumeRouter.get("/", controller.listResumes);
resumeRouter.get("/:id", validate(resumeIdSchema), controller.getResume);
resumeRouter.get("/:id/download", validate(resumeIdSchema), controller.downloadResume);
resumeRouter.delete("/:id", validate(resumeIdSchema), controller.deleteResume);
resumeRouter.post("/:id/analyze", validate(resumeIdSchema), controller.analyzeResume);
resumeRouter.post("/:id/match", validate(resumeIdSchema), controller.matchResume);
