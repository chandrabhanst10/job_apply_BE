import { Router } from "express";
import { authenticate } from "./../../middleware/auth.js";
import { validate } from "./../../middleware/validate.js";
import * as controller from "./controller.js";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema, tokenSchema } from "./validation.js";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), controller.register);
authRouter.post("/login", validate(loginSchema), controller.login);
authRouter.post("/refresh-token", validate(refreshSchema), controller.refresh);
authRouter.post("/logout", authenticate, controller.logout);
authRouter.post("/verify-email", validate(tokenSchema), controller.verifyEmail);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), controller.forgotPassword);
authRouter.post("/reset-password", validate(resetPasswordSchema), controller.resetPassword);
authRouter.post("/change-password", authenticate, validate(changePasswordSchema), controller.changePassword);
authRouter.post("/oauth/:provider", controller.oauthLogin);
authRouter.get("/me", authenticate, controller.me);
