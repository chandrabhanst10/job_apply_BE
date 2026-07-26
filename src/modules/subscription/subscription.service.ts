import {
  findSubscriptionByUserId,
  upsertDefaultSubscription,
  findTodayUsageLog,
  incrementUsageMetric
} from "./core/index.js";

export class SubscriptionService {
  private getTodayDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  async getUserSubscription(userId: string) {
    let sub = await findSubscriptionByUserId(userId);
    if (!sub) {
      sub = await upsertDefaultSubscription(userId);
    }
    return sub;
  }

  async getTodayUsage(userId: string) {
    const dateStr = this.getTodayDateString();
    const usage = await findTodayUsageLog(userId, dateStr);
    return {
      date: dateStr,
      applicationsSubmitted: usage?.applicationsSubmitted || 0,
      feedScansExecuted: usage?.feedScansExecuted || 0,
      promptTestsRun: usage?.promptTestsRun || 0,
      aiTokensEstimated: usage?.aiTokensEstimated || 0
    };
  }

  async checkQuota(
    userId: string,
    metric: "applicationsSubmitted" | "feedScansExecuted" | "promptTestsRun"
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const [sub, usage] = await Promise.all([
      this.getUserSubscription(userId),
      this.getTodayUsage(userId)
    ]);

    let limit = 10;
    if (metric === "applicationsSubmitted") {
      limit = sub.limits?.maxDailyApplications ?? 10;
    } else if (metric === "feedScansExecuted") {
      limit = sub.limits?.maxDailyFeedScans ?? 5;
    } else if (metric === "promptTestsRun") {
      limit = sub.limits?.maxDailyPromptTests ?? 20;
    }

    const current = usage[metric];
    const allowed = current < limit;

    return { allowed, current, limit };
  }

  async recordUsage(
    userId: string,
    metric: "applicationsSubmitted" | "feedScansExecuted" | "promptTestsRun",
    count = 1
  ) {
    const dateStr = this.getTodayDateString();
    return incrementUsageMetric(userId, dateStr, metric, count);
  }
}

export const subscriptionService = new SubscriptionService();
