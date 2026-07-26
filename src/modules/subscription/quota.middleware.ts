import type { NextFunction, Request, Response } from "express";
import { subscriptionService } from "./subscription.service.js";
import { ForbiddenError } from "../../utils/app-error.js";

export function enforceQuota(metric: "applicationsSubmitted" | "feedScansExecuted" | "promptTestsRun") {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.sub) {
      next();
      return;
    }

    try {
      const quota = await subscriptionService.checkQuota(req.user.sub, metric);
      if (!quota.allowed) {
        next(
          new ForbiddenError(
            `Daily quota limit reached for ${metric}. Allowed: ${quota.limit}, Current: ${quota.current}. Upgrade your plan for higher limits.`
          )
        );
        return;
      }
      next();
    } catch (err: unknown) {
      next(err);
    }
  };
}
