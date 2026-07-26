import { HttpStatus } from "../../constants/http.js";
import { subscriptionService } from "./subscription.service.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { sendSuccess } from "../../utils/response.js";

export const getMySubscription = asyncHandler(async (req, res) => {
  const userId = req.user!.sub;
  const [subscription, usage] = await Promise.all([
    subscriptionService.getUserSubscription(userId),
    subscriptionService.getTodayUsage(userId)
  ]);

  sendSuccess(res, HttpStatus.OK, "Subscription details retrieved", {
    subscription,
    todayUsage: usage
  });
});
