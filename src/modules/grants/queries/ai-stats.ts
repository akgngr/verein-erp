import "server-only";
import {getDb} from "@/shared/db";
const STATUSES = ["PLANNED", "APPLIED", "APPROVED", "ACTIVE", "REPORTED", "CLOSED", "REJECTED"] as const;
export async function grantStats() {
  const rows = await getDb().grant.findMany({ select: { status: true, approvedCents: true, reportDueAt: true, reportSubmittedAt: true } });
  const now = new Date();
  return {
    byStatus: Object.fromEntries(STATUSES.map((status) => [status, rows.filter((row) => row.status === status).length])),
    approvedTotal: rows.reduce((sum, row) => sum + (row.approvedCents ?? 0), 0) / 100,
    reportsOverdue: rows.filter((row) => row.reportDueAt && !row.reportSubmittedAt && row.reportDueAt < now).length,
    reportsDueIn30Days: rows.filter((row) => row.reportDueAt && !row.reportSubmittedAt && row.reportDueAt >= now && row.reportDueAt.getTime() - now.getTime() < 30 * 86_400_000).length,
  };
}
