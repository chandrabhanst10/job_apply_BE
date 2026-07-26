import { queryDashboardSummary, queryRecentActivity } from "./core/index.js";
import { listJobApplicationsByUser } from "../automation/core/view.js";
import { listFeedOpportunitiesByUserId } from "../feed-scanner/core/view.js";

export class DashboardService {
  async summary(userId: string) {
    return queryDashboardSummary(userId);
  }

  async recentActivity(userId: string) {
    return queryRecentActivity(userId);
  }

  async exportCsvReport(userId: string): Promise<string> {
    const [officialApps, feedOpps] = await Promise.all([
      listJobApplicationsByUser(userId, 200, 0),
      listFeedOpportunitiesByUserId(userId, {}, 200, 0)
    ]);

    const header = "Type,Company,Job Title,Platform,Status,Match Score / Info,Application URL / Method,Date\n";

    const officialRows = officialApps.map(a => {
      const company = `"${(a.company || "").replace(/"/g, '""')}"`;
      const title = `"${(a.jobTitle || "").replace(/"/g, '""')}"`;
      const url = `"${(a.jobUrl || "").replace(/"/g, '""')}"`;
      const date = a.createdAt ? new Date(a.createdAt).toISOString() : "";
      return `Official Job,${company},${title},${a.platform},${a.status},N/A,${url},${date}`;
    });

    const feedRows = feedOpps.map(f => {
      const company = `"${(f.company || "").replace(/"/g, '""')}"`;
      const title = `"${(f.jobTitle || "").replace(/"/g, '""')}"`;
      const method = `"${f.applicationMethod || "manual_review"}"`;
      const date = f.createdAt ? new Date(f.createdAt).toISOString() : "";
      return `Recruiter Feed,${company},${title},${f.platform},${f.status},${f.matchScore || 0}%,${method},${date}`;
    });

    return header + [...officialRows, ...feedRows].join("\n");
  }
}

export const dashboardService = new DashboardService();
