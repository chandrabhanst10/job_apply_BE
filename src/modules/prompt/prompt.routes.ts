import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  getAllPrompts,
  savePromptOverride,
  resetPromptOverride,
  testPrompt
} from "./prompt.controller.js";

export const promptRouter = Router();

promptRouter.use(authenticate);
promptRouter.get("/", getAllPrompts);
promptRouter.patch("/:promptKey", savePromptOverride);
promptRouter.delete("/:promptKey", resetPromptOverride);
promptRouter.post("/test", testPrompt);
