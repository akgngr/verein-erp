import "server-only";
import { emitAutomationEvent } from "@/shared/automation/emit";

import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { moduleChannelRegistry } from "@/campaign-channel-registry";
import { moduleRecipientRegistry } from "@/recipient-registry";
import { isMailConfigured, sendMail, sendMailBatch } from "@/modules/mail/automation";
import { createWorkflow, publishWorkflow, saveWorkflowDraft, setWorkflowEnabled, startWorkflow } from "@/modules/automation/automation";
import { splitForChannel, type CampaignChannel, type ChannelConfig } from "@/shared/campaigns/channel";
import { canEncryptSecrets, openSecret, sealSecret } from "@/shared/security/secret-box";
import { injectTracking, newTrackingToken } from "./tracking";
import { campaignFinishedEvent, sendCampaignTask } from "../automation";
import { loadPermissionPolicy, getUserById } from "@/modules/users/automation";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { getDb } from "@/shared/db";
import { renderMailTemplate, renderMailTemplateHtml, type Recipient, type RecipientSource } from "@/shared/mailings/define";
import { can } from "@/shared/permissions/define";
import { mailingsPermissions } from "../permissions";
import type { TaskExecutionContext } from "@/shared/automation/define";
import type { Role } from "@/shared/roles";

export type SourceInfo = { id: string; moduleKey: string; key: string; placeholders: string[]; sampleVars: Record<string, string>; filters: { key: string; options: string[]; defaults: string[]; dynamic: boolean }[] };
type Actor = { id: string; label: string };

/** Etkin modüllerin kampanya kanalları. */
export async function availableChannels(): Promise<CampaignChannel[]> {
  const usable = new Set(await listUsableModuleKeys());
  return moduleChannelRegistry.filter((entry) => usable.has(entry.module)).flatMap((entry) => entry.channels);
}

export async function findChannel(key: string): Promise<CampaignChannel | null> {
  return (await availableChannels()).find((channel) => channel.key === key) ?? null;
}

const SECRET_PURPOSE = "mailings-channel-secrets";

/** Kanal ayarları: düz değerler + çözülmüş gizliler (yalnız sunucu). */
export async function getChannelConfig(key: string): Promise<ChannelConfig> {
  const row = await getDb().mailingChannelConfig.findUnique({ where: { channel: key } });
  if (!row) return {};
  const plain = (row.settings ?? {}) as Record<string, string>;
  const secrets = row.secretsEnc ? (JSON.parse(openSecret(SECRET_PURPOSE, row.secretsEnc) ?? "{}") as Record<string, string>) : {};
  return { ...plain, ...secrets };
}

/** Yönetici: kanal ayarlarını kaydeder. Boş gelen gizli alan mevcut değeri korur. */
export async function saveChannelConfig(key: string, values: Record<string, string>, actorId: string, origin?: string): Promise<boolean> {
  const channel = await findChannel(key);
  if (!channel?.settings) return false;
  if (!canEncryptSecrets()) throw new Error("MAILING_NO_ENCRYPTION");
  const current = await getChannelConfig(key);
  const plain: Record<string, string> = {};
  const secrets: Record<string, string> = {};
  for (const setting of channel.settings) {
    const value = (values[setting.key] ?? "").trim().slice(0, 2000);
    if (setting.options && value && !setting.options.includes(value)) continue;
    if (setting.secret) secrets[setting.key] = value || current[setting.key] || "";
    else plain[setting.key] = value;
  }
  const secretsEnc = sealSecret(SECRET_PURPOSE, JSON.stringify(secrets));
  await getDb().mailingChannelConfig.upsert({
    where: { channel: key },
    create: { channel: key, settings: plain, secretsEnc, updatedById: actorId },
    update: { settings: plain, secretsEnc, updatedById: actorId },
  });
  if (channel.setup && origin) {
    const config = await getChannelConfig(key);
    if (await channel.isConfigured(config)) await channel.setup(config, origin);
  }
  return true;
}

/** Ayar ekranı: değerler (gizliler yalnız "kayıtlı mı" olarak). */
export async function listChannelSettings(origin = "") {
  const channels = (await availableChannels()).filter((channel) => channel.settings?.length);
  return Promise.all(channels.map(async (channel) => {
    const config = await getChannelConfig(channel.key);
    return {
      key: channel.key,
      configured: await channel.isConfigured(config),
      webhooks: origin && channel.webhookUrls ? channel.webhookUrls(config, origin) : [],
      settings: (channel.settings ?? []).map((setting) => ({
        key: setting.key,
        secret: Boolean(setting.secret),
        options: setting.options ? [...setting.options] : null,
        value: setting.secret ? "" : (config[setting.key] ?? setting.defaultValue ?? ""),
        stored: Boolean(config[setting.key]),
      })),
    };
  }));
}

/** Sihirbaz için: kanal, yapılandırma durumu ve yetenekleri. */
export async function listChannelInfo() {
  return Promise.all((await availableChannels()).map(async (channel) => ({
    key: channel.key,
    icon: channel.icon,
    capabilities: channel.capabilities,
    configured: await channel.isConfigured(await getChannelConfig(channel.key)),
  })));
}

/**
 * Kaynak listesini kanal için hazırlar: kanal zenginleştirmesi (ör. Telegram eşleşmesi) ve tüm etkin
 * kanalların ek yer tutucuları ({telegramLink} gibi) değişkenlere eklenir.
 */
async function prepareRecipients(sourceId: string, list: Recipient[], channel: CampaignChannel): Promise<Recipient[]> {
  const enriched = channel.enrich ? await channel.enrich(list, await getChannelConfig(channel.key), sourceId) : list;
  const providers = (await availableChannels()).filter((item) => item.placeholders);
  if (!providers.length) return enriched;
  const keys = enriched.map((row) => `${sourceId}:${row.id}`);
  const extra = await Promise.all(providers.map(async (item) => {
    const config = await getChannelConfig(item.key);
    return (await item.isConfigured(config)) ? item.placeholders!.values(keys, config) : ({} as Record<string, Record<string, string>>);
  }));
  return enriched.map((row, index) => ({
    ...row,
    vars: Object.assign({}, ...extra.map((values) => values[keys[index]] ?? {}), row.vars),
  }));
}

/** Etkin kanalların sunduğu ek yer tutucu adları (sihirbazda gösterilir). */
export async function channelPlaceholderKeys(): Promise<string[]> {
  return (await availableChannels()).flatMap((channel) => [...(channel.placeholders?.keys ?? [])]);
}

/** Kullanıcının kullanabildiği kaynaklar: modül etkin + kaynağın izni. */
export async function listSources(role: Role): Promise<SourceInfo[]> {
  const usable = new Set(await listUsableModuleKeys());
  const result: SourceInfo[] = [];
  for (const entry of moduleRecipientRegistry.filter((item) => usable.has(item.moduleKey))) {
    for (const source of entry.sources.filter((item) => can(role, item.permission.definition, item.permission.action))) {
      result.push({
        id: `${entry.moduleKey}:${source.key}`,
        moduleKey: entry.moduleKey,
        key: source.key,
        placeholders: source.placeholders,
        sampleVars: source.sampleVars,
        filters: source.filters.map((filter) => ({ key: filter.key, options: filter.options, defaults: filter.defaults ?? [], dynamic: Boolean(filter.loadOptions) })),
      });
    }
  }
  return result;
}

/** Ekranda gösterilecek kaynaklar: dinamik filtre seçenekleri (ör. şehirler) yüklenmiş halde. */
export async function listSourcesWithOptions(role: Role): Promise<SourceInfo[]> {
  const sources = await listSources(role);
  for (const info of sources) {
    const [moduleKey, key] = info.id.split(":");
    const source = moduleRecipientRegistry.find((entry) => entry.moduleKey === moduleKey)?.sources.find((item) => item.key === key);
    for (const filter of info.filters) {
      const loader = source?.filters.find((item) => item.key === filter.key)?.loadOptions;
      if (loader) filter.options = await loader();
    }
  }
  return sources;
}

async function findSource(role: Role, id: string): Promise<RecipientSource | null> {
  if (!(await listSources(role)).some((source) => source.id === id)) return null;
  const [moduleKey, key] = id.split(":");
  return moduleRecipientRegistry.find((entry) => entry.moduleKey === moduleKey)?.sources.find((source) => source.key === key) ?? null;
}

function split(list: Recipient[]) {
  const noEmail = list.filter((row) => !row.email).length;
  const optOut = list.filter((row) => row.email && row.optOut).length;
  return { eligible: list.filter((row) => row.email && !row.optOut), noEmail, optOut };
}

export async function previewSource(role: Role, sourceId: string, filter: Record<string, string[]>, channelKey = "email") {
  const source = await findSource(role, sourceId);
  const channel = await findChannel(channelKey);
  if (!source || !channel) return null;
  const list = await prepareRecipients(sourceId, await source.resolve(filter), channel);
  const { eligible, noAddress, optOut } = splitForChannel(channel, list);
  return { matched: list.length, eligible: eligible.length, noEmail: noAddress, optOut };
}

export async function sendTest(role: Role, input: { sourceId: string; filter: Record<string, string[]>; subject: string; body: string; bodyHtml?: string; to: string; toName: string }) {
  const source = await findSource(role, input.sourceId);
  if (!source) return null;
  const sample = split(await source.resolve(input.filter)).eligible[0];
  const vars = sample?.vars ?? source.sampleVars;
  return sendMail({ to: input.to, toName: input.toName, subject: `[Test] ${renderMailTemplate(input.subject, vars)}`, text: renderMailTemplate(input.body, vars), html: input.bodyHtml ? renderMailTemplateHtml(input.bodyHtml, vars) : undefined, context: { module: "mailings", reference: "test" } });
}

export type CampaignInput = {
  id?: string;
  name: string;
  channel: string;
  sourceId: string;
  filter: Record<string, string[]>;
  subject: string;
  body: string;
  bodyHtml?: string;
  /** Blok tasarımı (yeniden düzenleme için); gönderimde bodyHtml kullanılır. */
  design?: unknown;
  scheduledAt?: Date | null;
  /** E-posta açılma/tıklama izleme. */
  tracking?: boolean;
};

/** Taslak kaydet (oluştur/güncelle). Yalnız DRAFT kampanyalar düzenlenebilir. */
export async function saveDraft(role: Role, input: CampaignInput, actor: Actor): Promise<{ id: string } | null> {
  if (!(await findSource(role, input.sourceId)) || !(await findChannel(input.channel))) return null;
  const db = getDb();
  const data = {
    name: input.name,
    channel: input.channel,
    source: input.sourceId,
    filter: input.filter as Prisma.InputJsonValue,
    subject: input.subject,
    body: input.body,
    bodyHtml: input.bodyHtml ?? null,
    design: (input.design ?? undefined) as Prisma.InputJsonValue | undefined,
    scheduledAt: input.scheduledAt ?? null,
    tracking: input.tracking ?? true,
  };
  if (input.id) {
    const updated = await db.mailingCampaign.updateMany({ where: { id: input.id, status: "DRAFT" }, data });
    return updated.count ? { id: input.id } : null;
  }
  return db.mailingCampaign.create({ data: { ...data, status: "DRAFT", createdById: actor.id, createdByLabel: actor.label }, select: { id: true } });
}

/** İş akışı taslağı: tetikleyici (elle) → [planlıysa bekle] → kampanyayı gönder. */
export function campaignWorkflowDraft(campaignId: string, labels: { trigger: string; wait: string; send: string }, scheduledAt: Date | null) {
  const nodes: unknown[] = [{ id: "trigger", data: { type: "trigger", properties: { label: labels.trigger, triggerType: "manual" } } }];
  const edges: unknown[] = [];
  let previous = "trigger";
  if (scheduledAt) {
    nodes.push({ id: "wait", data: { type: "delay", properties: { label: labels.wait, mode: "until", until: scheduledAt.toISOString() } } });
    edges.push({ id: "trigger-wait", source: "trigger", target: "wait" });
    previous = "wait";
  }
  nodes.push({ id: "send", data: { type: `task.${sendCampaignTask.key}`, properties: { label: labels.send, campaignId } } });
  edges.push({ id: `${previous}-send`, source: previous, target: "send" });
  return { nodes, edges };
}

/**
 * Kampanyayı başlatır: kaydı (taslaktan veya yeni) SCHEDULED/SENDING yapar, onu çalıştıran bir iş akışı
 * oluşturup yayımlar ve başlatır. Alıcı listesi saklanmaz; gönderimde güncel veriden yeniden hesaplanır.
 */
export async function launchCampaign(
  role: Role,
  input: CampaignInput,
  actor: Actor,
  labels: { workflow: string; trigger: string; wait: string; send: string },
  /** İzleme bağlantılarının kökü (isteğin genel adresi). */
  baseUrl?: string,
): Promise<{ id: string; recipients: number; workflowId: string } | null> {
  const source = await findSource(role, input.sourceId);
  const channel = await findChannel(input.channel);
  if (!source || !channel) return null;
  const { eligible, noAddress, optOut } = splitForChannel(channel, await prepareRecipients(input.sourceId, await source.resolve(input.filter), channel));
  if (eligible.length === 0) return { id: "", recipients: 0, workflowId: "" };

  const scheduledAt = input.scheduledAt && input.scheduledAt.getTime() > Date.now() + 60_000 ? input.scheduledAt : null;
  const draft = input.id ? await saveDraft(role, input, actor) : null;
  if (input.id && !draft) return null;
  const db = getDb();
  const data = {
    name: input.name,
    channel: input.channel,
    source: input.sourceId,
    filter: input.filter as Prisma.InputJsonValue,
    subject: input.subject,
    body: input.body,
    bodyHtml: input.bodyHtml ?? null,
    design: (input.design ?? undefined) as Prisma.InputJsonValue | undefined,
    scheduledAt,
    status: (scheduledAt ? "SCHEDULED" : "SENDING") as "SCHEDULED" | "SENDING",
    tracking: input.tracking ?? true,
    trackingBaseUrl: baseUrl ?? null,
    recipientCount: eligible.length,
    skippedNoEmail: noAddress,
    skippedOptOut: optOut,
  };
  const campaign = draft
    ? await db.mailingCampaign.update({ where: { id: draft.id }, data, select: { id: true } })
    : await db.mailingCampaign.create({ data: { ...data, createdById: actor.id, createdByLabel: actor.label }, select: { id: true } });

  try {
    const workflow = await createWorkflow({ name: labels.workflow.slice(0, 200), description: "", actorId: actor.id });
    await saveWorkflowDraft(workflow.id, campaignWorkflowDraft(campaign.id, labels, scheduledAt), actor.id);
    await publishWorkflow(workflow.id, actor.id);
    await db.mailingCampaign.update({ where: { id: campaign.id }, data: { workflowId: workflow.id } });
    await startWorkflow(workflow.id, { campaignId: campaign.id }, { actorId: actor.id });
    return { id: campaign.id, recipients: eligible.length, workflowId: workflow.id };
  } catch (error) {
    await db.mailingCampaign.update({ where: { id: campaign.id }, data: { status: "FAILED", finishedAt: new Date() } });
    throw error;
  }
}

/** Taslak veya planlı kampanyayı iptal eder; planlı akış devre dışı kalır, bekleme bitince gönderim atlanır. */
export async function cancelCampaign(id: string, actorId: string): Promise<boolean> {
  const db = getDb();
  const campaign = await db.mailingCampaign.findUnique({ where: { id }, select: { status: true, workflowId: true } });
  if (!campaign || !["DRAFT", "SCHEDULED"].includes(campaign.status)) return false;
  await db.mailingCampaign.update({ where: { id }, data: { status: "CANCELLED", finishedAt: new Date() } });
  if (campaign.workflowId) await setWorkflowEnabled(campaign.workflowId, false, actorId).catch(() => undefined);
  return true;
}

export async function deleteDraft(id: string): Promise<boolean> {
  const result = await getDb().mailingCampaign.deleteMany({ where: { id, status: { in: ["DRAFT", "CANCELLED"] } } });
  return result.count > 0;
}

export async function getCampaign(id: string) {
  return getDb().mailingCampaign.findUnique({ where: { id } });
}

/**
 * Programatik API (diğer modüller, erişim onayıyla): verilen alıcılara kişiye özel e-posta. İtiraz
 * edenler ve e-postasızlar atlanır; gönderim arka planda sürer, geçmişte "<modül>:api" kaynağıyla görünür.
 */
export async function sendBulkMail(input: { moduleKey: string; recipients: Recipient[]; subject: string; body: string; bodyHtml?: string; actor: Actor }): Promise<{ id: string; recipients: number }> {
  return createAndRun({ source: `${input.moduleKey}:api`, filter: {}, subject: input.subject, body: input.body, bodyHtml: input.bodyHtml, actor: input.actor, list: input.recipients });
}

/**
 * Worker entry point. Re-resolves the source at execution time and rechecks the
 * creator's active account, mailing permission, source permission and module gates.
 * Recipient addresses are never copied into the automation payload.
 */
async function processCampaignAttempt(campaignId: string, context: TaskExecutionContext) {
  const db = getDb();
  const found = await db.mailingCampaign.findUnique({ where: { id: campaignId } });
  if (!found || (found.status !== "SENDING" && found.status !== "SCHEDULED")) return { skipped: true };
  // Planlı kampanya: bekleme adımı bitti, gönderim başlıyor.
  const campaign = found.status === "SCHEDULED"
    ? await db.mailingCampaign.update({ where: { id: found.id }, data: { status: "SENDING" } })
    : found;

  const failCampaign = async (errorCode: string) => {
    await db.mailingCampaign.updateMany({
      where: { id: campaign.id, status: "SENDING" },
      data: { status: "FAILED", finishedAt: new Date() },
    });
    return { failed: true, errorCode };
  };

  const usable = new Set(await listUsableModuleKeys());
  if (!usable.has("mailings") || !usable.has("mail") || !usable.has("automation")) {
    return failCampaign("MAILING_MODULE_UNAVAILABLE");
  }

  const creator = campaign.createdById === context.requestedById
    ? await getUserById(campaign.createdById)
    : null;
  if (!creator?.isActive) return failCampaign("MAILING_ACTOR_INACTIVE");

  await loadPermissionPolicy();
  const role = creator.role as Role;
  if (!can(role, mailingsPermissions, "create")) return failCampaign("MAILING_PERMISSION_REVOKED");

  const source = await findSource(role, campaign.source);
  if (!source) return failCampaign("MAILING_SOURCE_PERMISSION_REVOKED");

  const filterResult = z.record(z.string().max(40), z.array(z.string().max(40)).max(20)).safeParse(campaign.filter);
  if (!filterResult.success) throw new Error("MAILING_FILTER_INVALID");
  const filter = filterResult.data;
  const channel = await findChannel(campaign.channel);
  if (!channel) return failCampaign("MAILING_CHANNEL_UNAVAILABLE");
  const config = await getChannelConfig(channel.key);
  if (!(await channel.isConfigured(config))) return failCampaign("MAILING_CHANNEL_NOT_CONFIGURED");
  const { eligible, noAddress: noEmail, optOut } = splitForChannel(channel, await prepareRecipients(campaign.source, await source.resolve(filter), channel));
  // A retry after a worker restart must not resend recipients whose successful delivery
  // was already durably logged for this campaign.
  const normalize = (value: string) => value.trim().toLowerCase();
  const deliveredList = channel.delivered
    ? await channel.delivered(campaign.id)
    : (await db.mailingDelivery.findMany({ where: { campaignId: campaign.id, status: { in: ["SENT", "DELIVERED", "READ"] } }, select: { address: true } })).map((row) => row.address);
  const delivered = new Set(deliveredList.map(normalize));
  const alreadySent = eligible.filter((row) => delivered.has(normalize(channel.address(row) ?? ""))).length;
  const pending = eligible.filter((row) => !delivered.has(normalize(channel.address(row) ?? "")));

  // Alıcı başına kayıt + izleme belirteci (yeniden denemede aynı belirteç kullanılır).
  const addressOf = (row: Recipient) => (channel.address(row) as string).slice(0, 200);
  if (pending.length) {
    await db.mailingDelivery.createMany({
      data: pending.map((row) => ({ campaignId: campaign.id, channel: channel.key, address: addressOf(row), token: newTrackingToken() })),
      skipDuplicates: true,
    });
  }
  const tokens = new Map((await db.mailingDelivery.findMany({
    where: { campaignId: campaign.id, address: { in: pending.map(addressOf) } },
    select: { address: true, token: true },
  })).map((row) => [row.address, row.token]));
  const track = channel.key === "email" && campaign.tracking && Boolean(campaign.trackingBaseUrl);

  const messages = pending.map((row) => {
    // HTML gövde (editör) worker'da da kişiselleştirilir; değerler HTML'de kaçışlanır.
    const html = channel.capabilities.html && campaign.bodyHtml ? renderMailTemplateHtml(campaign.bodyHtml, row.vars) : undefined;
    const token = tokens.get(addressOf(row));
    return {
      to: channel.address(row) as string,
      toName: row.name,
      subject: renderMailTemplate(campaign.subject, row.vars),
      text: renderMailTemplate(campaign.body, row.vars),
      html: html && track && token ? injectTracking(html, campaign.trackingBaseUrl!, token) : html,
      reference: campaign.id,
      callbackBaseUrl: campaign.trackingBaseUrl ?? undefined,
    };
  });

  let results: Awaited<ReturnType<CampaignChannel["sendBatch"]>>;
  try {
    results = await channel.sendBatch(messages, config);
  } catch (error) {
    if (context.attempt >= 3) {
      await failCampaign("MAILING_SEND_ATTEMPTS_EXHAUSTED");
    }
    throw error;
  }
  // E-posta: SMTP sunucusu kabul ettiyse teslim edildi sayılır; SMS/WhatsApp teslimi sağlayıcı bildirir.
  const now = new Date();
  await db.$transaction(messages.map((message, index) => {
    const result = results[index];
    return db.mailingDelivery.update({
      where: { campaignId_address: { campaignId: campaign.id, address: message.to.slice(0, 200) } },
      data: result?.ok
        ? { status: channel.key === "email" ? "DELIVERED" : "SENT", sentAt: now, ...(channel.key === "email" ? { deliveredAt: now } : {}), providerId: result.providerId?.slice(0, 200) ?? null, error: null }
        : { status: "FAILED", error: (result?.error ?? "SEND_FAILED").slice(0, 80) },
    });
  }));
  const sent = alreadySent + results.filter((result) => result.ok).length;
  const failed = results.filter((result) => !result.ok).length;
  await db.mailingCampaign.update({
    where: { id: campaign.id },
    data: {
      recipientCount: eligible.length,
      skippedNoEmail: noEmail,
      skippedOptOut: optOut,
      sentCount: sent,
      failedCount: failed,
      status: sent === 0 && failed > 0 ? "FAILED" : "DONE",
      finishedAt: new Date(),
    },
  });
  await emitAutomationEvent(campaignFinishedEvent, { campaignId: campaign.id, sent, failed }).catch(() => false);
  return { recipients: eligible.length, sent, failed, skippedNoEmail: noEmail, skippedOptOut: optOut };
}


/**
 * Ensure terminal worker failures cannot leave a campaign permanently in SENDING.
 * Intermediate attempts remain retryable; only the final attempt closes the campaign.
 */
export async function processCampaign(campaignId: string, context: TaskExecutionContext) {
  try {
    return await processCampaignAttempt(campaignId, context);
  } catch (error) {
    if (context.attempt >= 3) {
      await getDb().mailingCampaign.updateMany({
        where: { id: campaignId, status: "SENDING" },
        data: { status: "FAILED", finishedAt: new Date() },
      });
    }
    throw error;
  }
}

async function createAndRun(input: { source: string; filter: Record<string, string[]>; subject: string; body: string; bodyHtml?: string; actor: Actor; list: Recipient[] }) {
  const { eligible, noEmail, optOut } = split(input.list);
  if (eligible.length === 0) return { id: "", recipients: 0 };
  const campaign = await getDb().mailingCampaign.create({
    data: {
      source: input.source,
      filter: input.filter as Prisma.InputJsonValue,
      subject: input.subject,
      body: input.body,
      bodyHtml: input.bodyHtml ?? null,
      recipientCount: eligible.length,
      skippedNoEmail: noEmail,
      skippedOptOut: optOut,
      createdById: input.actor.id,
      createdByLabel: input.actor.label,
    },
    select: { id: true },
  });
  const messages = eligible.map((row) => ({
    to: row.email as string,
    toName: row.name,
    subject: renderMailTemplate(input.subject, row.vars),
    text: renderMailTemplate(input.body, row.vars),
    html: input.bodyHtml ? renderMailTemplateHtml(input.bodyHtml, row.vars) : undefined,
    context: { module: "mailings", reference: campaign.id },
  }));
  void run(campaign.id, messages);
  return { id: campaign.id, recipients: eligible.length };
}

async function run(id: string, messages: Parameters<typeof sendMailBatch>[0]) {
  const db = getDb();
  try {
    const results = await sendMailBatch(messages);
    const sent = results.filter((result) => result.ok).length;
    await db.mailingCampaign.update({ where: { id }, data: { sentCount: sent, failedCount: results.length - sent, status: sent === 0 ? "FAILED" : "DONE", finishedAt: new Date() } });
  } catch (error) {
    console.error("[mailings] send failed:", error instanceof Error ? error.message : error);
    await db.mailingCampaign.update({ where: { id }, data: { status: "FAILED", finishedAt: new Date() } });
  }
}

/** Kayıtlı segmentler (filtre önayarları); kullanıcının erişebildiği kaynaklarla sınırlı. */
export async function listSegments(role: Role) {
  const allowed = new Set((await listSources(role)).map((source) => source.id));
  const rows = await getDb().mailingSegment.findMany({ orderBy: { name: "asc" } });
  return rows.filter((row) => allowed.has(row.source)).map((row) => ({ id: row.id, name: row.name, source: row.source, filter: row.filter as Record<string, string[]> }));
}

export async function saveSegment(role: Role, input: { name: string; source: string; filter: Record<string, string[]>; actor: Actor }) {
  if (!(await findSource(role, input.source))) return null;
  return getDb().mailingSegment.upsert({
    where: { source_name: { source: input.source, name: input.name } },
    create: { name: input.name, source: input.source, filter: input.filter as Prisma.InputJsonValue, createdById: input.actor.id, createdByLabel: input.actor.label },
    update: { filter: input.filter as Prisma.InputJsonValue },
    select: { id: true },
  });
}

export async function deleteSegment(id: string) {
  await getDb().mailingSegment.delete({ where: { id } });
}

export async function listCampaigns() {
  return getDb().mailingCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
}

export async function listCampaignSummaries(campaignIds: string[]) {
  if (campaignIds.length === 0) return [];
  return getDb().mailingCampaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, subject: true, status: true, recipientCount: true, sentCount: true, failedCount: true },
  });
}

export { isMailConfigured };
