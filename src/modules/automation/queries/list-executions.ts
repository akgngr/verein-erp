import "server-only";

import { listFailedMailLogsForCampaigns } from "@/modules/mail/server";
import { listCampaignSummaries } from "@/modules/mailings/server";
import { getDb } from "@/shared/db";

export async function listAutomationExecutions() {
  const db = getDb();
  const executions = await db.automationExecution.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      steps: { orderBy: { createdAt: "asc" } },
      logs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  const campaignIds = executions.flatMap((execution) => {
    if (execution.sourceModule !== "mailings" || !execution.input || typeof execution.input !== "object" || Array.isArray(execution.input)) return [];
    const campaignId = (execution.input as Record<string, unknown>).campaignId;
    return typeof campaignId === "string" ? [campaignId] : [];
  });

  if (campaignIds.length === 0) return executions.map((execution) => ({ ...execution, campaign: null, mailErrors: [] }));

  const [campaigns, mailErrors] = await Promise.all([
    listCampaignSummaries(campaignIds),
    listFailedMailLogsForCampaigns(campaignIds),
  ]);

  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  return executions.map((execution) => {
    const input = execution.input && typeof execution.input === "object" && !Array.isArray(execution.input)
      ? execution.input as Record<string, unknown>
      : {};
    const campaignId = typeof input.campaignId === "string" ? input.campaignId : null;
    return {
      ...execution,
      campaign: campaignId ? campaignById.get(campaignId) ?? null : null,
      mailErrors: campaignId ? mailErrors.filter((log) => log.reference === campaignId).slice(0, 5) : [],
    };
  });
}
