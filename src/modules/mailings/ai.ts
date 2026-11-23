import "server-only";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";
import {proposalAcknowledgementSchema} from "@/shared/ai/dataset";

import { z } from "zod";
import {aiListCursor,aiListPage,aiPageInfo} from "@/shared/ai/pagination";

import {PROPOSED, aiAction} from "@/shared/ai/define";
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

/**
 * F03 (#410): aidat hatırlatma TASLAĞI. Kitle sunucuda sabittir (aktif üyeler, açık/kısmi aidat; toplu
 * e-posta istemeyenler kaynakta zaten atlanır). Model alıcıları, tutarları veya filtreyi görmez/değiştiremez.
 * Akış: öneri kartı → kullanıcı onayı yalnız TASLAK kaydeder → gönderim ayrıca sihirbazda başlatılır →
 * kampanya mevcut mailings otomasyonu (iş akışı) ile çalışır.
 */
export const DUES_REMINDER_SOURCE = "members:members";
export const DUES_REMINDER_FILTER = { status: ["ACTIVE"], dues: ["OPEN"] } as const;
const duesReminderSchema = z.object({
  name: z.string().min(2).max(120),
  channel: z.string().min(2).max(30),
  subject: z.string().max(200),
  body: z.string().min(1).max(20000),
}).strict();

export const ai = defineModuleAiV2({
  module: "mailings",
  tools: [
    aiToolV2({
      name: "get_campaign_statistics",
      operation: "read",
      allowed: (user) => can(user.role, mailingsPermissions, "view"),
      description: "Campaign statistics: number of campaigns per status, messages sent and failed in the last 30 days, scheduled campaigns. No recipients.", // i18n-ignore (model-facing tool text)
      input: z.object({}),
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
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "mailings-get-campaign-statistics", "serverReads": ["MailingCampaign"], "modelFields": ["perStatus", "perStatus.DRAFT", "perStatus.SCHEDULED", "perStatus.SENDING", "perStatus.DONE", "perStatus.FAILED", "perStatus.CANCELLED", "last30Days", "last30Days.campaigns", "last30Days.sent", "last30Days.failed"], "processing": "approved_provider", "modelDataClass": "aggregate"},
    }),
    aiToolV2({
      name: "list_campaigns",
      operation: "read",
      allowed: (user) => can(user.role, mailingsPermissions, "view"),
      description: "Lists the latest 50 campaigns: name, subject, channel, status, recipient/sent/failed counts, created and scheduled time. Message bodies and recipients are not included.", // i18n-ignore (model-facing tool text)
      input: z.object({ status: z.enum(STATUSES).nullable(),cursor:aiListCursor }),
      run: async ({ status,cursor }) => {
        const page=aiListPage(cursor);
        const rows = await getDb().mailingCampaign.findMany({
          where: status ? { status } : {},
          orderBy: [{ createdAt: "desc" },{id:"asc"}],
          skip:(page-1)*50,take: 50,
          select: { id: true, name: true, subject: true, channel: true, status: true, recipientCount: true, sentCount: true, failedCount: true, createdAt: true, scheduledAt: true },
        });
        const total=await getDb().mailingCampaign.count({where:status?{status}:{}});
        return {...aiPageInfo(page,50,total),items:rows.map(({ createdAt, scheduledAt, ...row }) => ({ ...row, createdAt: createdAt.toISOString(), scheduledAt: scheduledAt?.toISOString() ?? null }))};
      },
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "mailings-list-campaigns", "serverReads": ["MailingCampaign"], "modelFields": ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.id", "items.name", "items.subject", "items.channel", "items.status", "items.recipientCount", "items.sentCount", "items.failedCount", "items.createdAt", "items.scheduledAt"], "processing": "approved_provider", "modelDataClass": "internal"},
    }),
    aiToolV2({
      name: "list_campaign_audiences",
      operation: "read",
      allowed: (user) => can(user.role, mailingsPermissions, "create"),
      description: "Audiences (recipient lists) and channels the user may use for a campaign: audience ids with their placeholders, channel keys. No people.", // i18n-ignore (model-facing tool text)
      input: z.object({}),
      run: async (_input, { user }) => ({
        audiences: (await listSources(user.role)).map((source) => ({ id: source.id, placeholders: source.placeholders })),
        channels: (await availableChannels()).map((channel) => channel.key),
      }),
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "mailings-list-campaign-audiences", "serverReads": [], "modelFields": ["audiences", "audiences.id", "audiences.placeholders", "channels"], "processing": "approved_provider", "modelDataClass": "internal"},
    }),
    aiToolV2({
      name: "propose_campaign_draft",
      operation: "create",
      allowed: (user) => can(user.role, mailingsPermissions, "create"),
      description: "PROPOSES a campaign DRAFT (audience id and channel from list_campaign_audiences). The body may use the audience placeholders like {firstName}. Nothing is sent: the user reviews and starts it in the campaign wizard.", // i18n-ignore (model-facing tool text)
      input:(draftSchema).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["audience_not_allowed","channel_not_available"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["audience_not_allowed","channel_not_available"])}).strict()]),
      policy:{"purpose":"mailings-proposal","serverReads":[],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async (input, { user, propose }) => {
        if (!(await listSources(user.role)).some((source) => source.id === input.sourceId)) return { status: "audience_not_allowed" } as const;
        if (!(await availableChannels()).some((channel) => channel.key === input.channel)) return { status: "channel_not_available" } as const;
        propose({ action: "draft", title: input.name, details: input.subject ? [input.channel, input.subject] : [input.channel], payload: input });
        return PROPOSED;
      },
    }),
    aiToolV2({
      name: "propose_dues_reminder_draft",
      operation: "create",
      allowed: (user) => can(user.role, mailingsPermissions, "create"),
      description: "PROPOSES a polite membership-dues reminder as a campaign DRAFT. The audience is fixed by the server: active members with open or partly paid dues (members who opted out of bulk mail are skipped). You never see recipients or amounts. Write a neutral, friendly text in the user's language; placeholders {firstName}, {lastName}, {membershipNumber} are allowed; do not threaten consequences or state legal claims. Nothing is sent: the user reviews the draft and starts it separately in the campaign wizard.", // i18n-ignore (model-facing tool text)
      input: duesReminderSchema,
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["audience_not_allowed","channel_not_available"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["audience_not_allowed","channel_not_available"])}).strict()]),
      policy:{"purpose":"mailings-dues-reminder-proposal","serverReads":[],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async (input, { user, propose }) => {
        if (!(await listSources(user.role)).some((source) => source.id === DUES_REMINDER_SOURCE)) return { status: "audience_not_allowed" } as const;
        if (!(await availableChannels()).some((channel) => channel.key === input.channel)) return { status: "channel_not_available" } as const;
        propose({ action: "dues_reminder_draft", title: input.name, details: input.subject ? [input.channel, input.subject] : [input.channel], payload: input });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    // Onay yalnız taslak kaydeder; kitle sunucuda sabittir (payload'dan kaynak/filtre okunmaz).
    dues_reminder_draft: aiAction({
      operation: "create",
      schema: duesReminderSchema,
      execute: (input) => saveCampaignDraftAction({ ...input, sourceId: DUES_REMINDER_SOURCE, filter: { status: [...DUES_REMINDER_FILTER.status], dues: [...DUES_REMINDER_FILTER.dues] } }),
    }),
    draft: aiAction({
      operation: "create",
      schema: draftSchema,
      execute: (input) => saveCampaignDraftAction({ ...input, filter: {} }),
    }),
  },
});
