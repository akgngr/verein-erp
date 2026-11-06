import "server-only";

import { z } from "zod";

import { PROPOSED, aiAction, aiTool, defineModuleAi } from "@/shared/ai/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { saveCampaignDraftAction } from "./actions/mailing-actions";
import { mailingsPermissions } from "./permissions";
import { availableChannels, listSources } from "./services/campaigns";

/**
 * Kampanyalar. Asistan yalnız kampanya özetini (ad, kanal, durum, sayılar) görür; alıcı listesi, filtre
 * ve mesaj gövdesi dönmez. Yeni kampanyayı yalnız TASLAK olarak önerir: gönderim her zaman kullanıcının
 * sihirbazda gözden geçirip başlatmasıyla olur.
 */
const STATUSES = ["DRAFT", "SCHEDULED", "SENDING", "DONE", "FAILED", "CANCELLED"] as const;

const draftSchema = z.object({
  name: z.string().min(2).max(120),
  channel: z.string().min(2).max(30),
  sourceId: z.string().min(3).max(80),
  subject: z.string().max(200),
  body: z.string().max(20000),
});

export const ai = defineModuleAi({
  module: "mailings",
  tools: [
    aiTool({
      name: "get_campaign_statistics",
      operation: "read",
      allowed: (user) => can(user.role, mailingsPermissions, "view"),
      description: "Campaign statistics: number of campaigns per status, messages sent and failed in the last 30 days, scheduled campaigns. No recipients.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async () => {
        const db = getDb();
        const since = new Date(Date.now() - 30 * 86_400_000);
        const [byStatus, recent] = await Promise.all([
          db.mailingCampaign.groupBy({ by: ["status"], _count: { _all: true } }),
          db.mailingCampaign.aggregate({ where: { createdAt: { gte: since } }, _sum: { sentCount: true, failedCount: true }, _count: { _all: true } }),
        ]);
        return {
          perStatus: Object.fromEntries(STATUSES.map((status) => [status, byStatus.find((row) => row.status === status)?._count._all ?? 0])),
          last30Days: { campaigns: recent._count._all, sent: recent._sum.sentCount ?? 0, failed: recent._sum.failedCount ?? 0 },
        };
      },
    }),
    aiTool({
      name: "list_campaigns",
      operation: "read",
      allowed: (user) => can(user.role, mailingsPermissions, "view"),
      description: "Lists the latest 50 campaigns: name, subject, channel, status, recipient/sent/failed counts, created and scheduled time. Message bodies and recipients are not included.", // i18n-ignore (model-facing tool text)
      schema: z.object({ status: z.enum(STATUSES).nullable() }),
      inputSchema: { type: "object", properties: { status: { type: ["string", "null"], enum: [...STATUSES, null] } }, required: ["status"], additionalProperties: false },
      run: async ({ status }) => {
        const rows = await getDb().mailingCampaign.findMany({
          where: status ? { status } : {},
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, name: true, subject: true, channel: true, status: true, recipientCount: true, sentCount: true, failedCount: true, createdAt: true, scheduledAt: true },
        });
        return rows.map(({ createdAt, scheduledAt, ...row }) => ({ ...row, createdAt: createdAt.toISOString(), scheduledAt: scheduledAt?.toISOString() ?? null }));
      },
    }),
    aiTool({
      name: "list_campaign_audiences",
      operation: "read",
      allowed: (user) => can(user.role, mailingsPermissions, "create"),
      description: "Audiences (recipient lists) and channels the user may use for a campaign: audience ids with their placeholders, channel keys. No people.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async (_input, { user }) => ({
        audiences: (await listSources(user.role)).map((source) => ({ id: source.id, placeholders: source.placeholders })),
        channels: (await availableChannels()).map((channel) => channel.key),
      }),
    }),
    aiTool({
      name: "propose_campaign_draft",
      operation: "create",
      allowed: (user) => can(user.role, mailingsPermissions, "create"),
      description: "PROPOSES a campaign DRAFT (audience id and channel from list_campaign_audiences). The body may use the audience placeholders like {firstName}. Nothing is sent: the user reviews and starts it in the campaign wizard.", // i18n-ignore (model-facing tool text)
      schema: draftSchema,
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" }, channel: { type: "string" }, sourceId: { type: "string" }, subject: { type: "string" }, body: { type: "string" } },
        required: ["name", "channel", "sourceId", "subject", "body"],
        additionalProperties: false,
      },
      run: async (input, { user, propose }) => {
        if (!(await listSources(user.role)).some((source) => source.id === input.sourceId)) return { status: "audience_not_allowed" };
        if (!(await availableChannels()).some((channel) => channel.key === input.channel)) return { status: "channel_not_available" };
        propose({ action: "draft", title: input.name, details: input.subject ? [input.channel, input.subject] : [input.channel], payload: input });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    draft: aiAction({
      operation: "create",
      schema: draftSchema,
      execute: (input) => saveCampaignDraftAction({ ...input, filter: {} }),
    }),
  },
});
