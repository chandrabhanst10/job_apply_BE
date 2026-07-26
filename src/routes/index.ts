import { Router } from "express";
import { authRouter } from "../modules/auth/routes.js";
import { userRouter } from "../modules/user/routes.js";
import { resumeRouter } from "../modules/resume/routes.js";
import { dashboardRouter } from "../modules/dashboard/routes.js";
import { notificationRouter } from "../modules/notification/routes.js";
import { connectionRouter } from "../modules/connections/routes.js";
import { automationRouter } from "../modules/automation/routes.js";
import { feedScannerRouter } from "../modules/feed-scanner/routes.js";
import { promptRouter } from "../modules/prompt/prompt.routes.js";
import { healthRouter } from "../modules/health/health.routes.js";
import { subscriptionRouter } from "../modules/subscription/subscription.routes.js";
import { extensionRouter } from "../modules/extension/extension.routes.js";
import { adminRouter } from "../modules/admin/admin.routes.js";
import { developerRouter } from "../modules/developer/developer.routes.js";
import { complianceRouter } from "../modules/compliance/compliance.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/resumes", resumeRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/connections", connectionRouter);
apiRouter.use("/automations", automationRouter);
apiRouter.use("/feed-scanner", feedScannerRouter);
apiRouter.use("/prompts", promptRouter);
apiRouter.use("/health", healthRouter);
apiRouter.use("/subscriptions", subscriptionRouter);
apiRouter.use("/extension", extensionRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/developer", developerRouter);
apiRouter.use("/compliance", complianceRouter);




