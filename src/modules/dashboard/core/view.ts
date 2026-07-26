import mongoose from "mongoose";
import { getResumeAnalysisStatsForUser } from "../../resume/core/view.js";
import { findAuditLogsByUserId } from "../../audit/core/view.js";
import { JobApplicationModel } from "../../automation/model.js";
import { FeedPostModel } from "../../feed-scanner/post.model.js";
import { FeedOpportunityModel } from "../../feed-scanner/opportunity.model.js";
import { UserModel } from "../../user/model.js";

export async function queryDashboardSummary(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      averageAtsScore: 0,
      analyzedCount: 0,
      totalJobsFound: 0,
      officialJobsFound: 0,
      feedJobsFound: 0,
      recruiterPostsScanned: 0,
      hiringPostsDetected: 0,
      companiesDiscovered: 0,
      totalApplications: 0,
      appliedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      successRate: 100,
      activeQueues: {
        feedScanner: "idle",
        applicationEngine: "idle",
        aiProcessor: "idle"
      }
    };
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const [
    { averageAtsScore, analyzedCount },
    officialJobApps,
    feedPostsScanned,
    hiringPostsCount,
    feedOpportunities,
    userDoc
  ] = await Promise.all([
    getResumeAnalysisStatsForUser(userId),
    JobApplicationModel.find({ userId: userObjectId }).exec(),
    FeedPostModel.countDocuments({ userId: userObjectId }),
    FeedPostModel.countDocuments({ userId: userObjectId, isHiring: true }),
    FeedOpportunityModel.find({ userId: userObjectId }).exec(),
    UserModel.findById(userObjectId).exec()
  ]);

  const totalOfficialJobs = officialJobApps.length;
  const totalFeedJobs = feedOpportunities.length;
  const totalJobsFound = totalOfficialJobs + totalFeedJobs;

  const appliedCount = officialJobApps.filter(a => a.status === "applied").length + feedOpportunities.filter(f => f.status === "applied").length;
  const pendingCount = officialJobApps.filter(a => a.status === "pending" || a.status === "applying").length + feedOpportunities.filter(f => f.status === "queued" || f.status === "applying").length;
  const failedCount = officialJobApps.filter(a => a.status === "failed").length + feedOpportunities.filter(f => f.status === "failed").length;
  const totalApplications = appliedCount + pendingCount + failedCount;

  const successRate = totalApplications > 0 ? Math.round((appliedCount / totalApplications) * 100) : 100;

  // Distinct company discovery set
  const companiesSet = new Set<string>();
  officialJobApps.forEach(a => { if (a.company) companiesSet.add(a.company.toLowerCase().trim()); });
  feedOpportunities.forEach(f => { if (f.company) companiesSet.add(f.company.toLowerCase().trim()); });

  const autopilotEnabled = userDoc?.autopilot?.linkedin?.enabled || userDoc?.autopilot?.naukri?.enabled || false;

  return {
    averageAtsScore,
    analyzedCount,
    totalJobsFound,
    officialJobsFound: totalOfficialJobs,
    feedJobsFound: totalFeedJobs,
    recruiterPostsScanned: feedPostsScanned,
    hiringPostsDetected: hiringPostsCount,
    companiesDiscovered: companiesSet.size,
    totalApplications,
    appliedCount,
    pendingCount,
    failedCount,
    successRate,
    autopilotEnabled,
    activeQueues: {
      feedScanner: autopilotEnabled ? "active" : "idle",
      applicationEngine: pendingCount > 0 ? "processing" : "idle",
      aiProcessor: "idle"
    }
  };
}

export async function queryRecentActivity(userId: string, limit = 30) {
  return findAuditLogsByUserId(userId, limit);
}
