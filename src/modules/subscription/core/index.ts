import { SubscriptionModel, type ISubscription } from "../subscription.model.js";
import { UsageLogModel, type IUsageLog } from "../usage-log.model.js";

export async function findSubscriptionByUserId(userId: string): Promise<ISubscription | null> {
  return SubscriptionModel.findOne({ userId }).exec();
}

export async function upsertDefaultSubscription(userId: string): Promise<ISubscription> {
  return SubscriptionModel.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, plan: "free", status: "active" } },
    { upsert: true, new: true }
  ).exec();
}

export async function findTodayUsageLog(userId: string, dateStr: string): Promise<IUsageLog | null> {
  return UsageLogModel.findOne({ userId, date: dateStr }).exec();
}

export async function incrementUsageMetric(
  userId: string,
  dateStr: string,
  metric: "applicationsSubmitted" | "feedScansExecuted" | "promptTestsRun",
  count = 1
): Promise<IUsageLog> {
  return UsageLogModel.findOneAndUpdate(
    { userId, date: dateStr },
    { $inc: { [metric]: count } },
    { upsert: true, new: true }
  ).exec();
}
