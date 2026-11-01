import "server-only";

import type { Prisma } from "@prisma/client";

import { moduleRecipientRegistry } from "@/recipient-registry";
import { isMailConfigured, sendMail, sendMailBatch } from "@/modules/mail/server";
import { listUsableModuleKeys } from "@/modules/system/server";
import { getDb } from "@/shared/db";
import { renderMailTemplate, type Recipient, type RecipientSource } from "@/shared/mailings/define";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

export type SourceInfo = { id: string; moduleKey: string; key: string; placeholders: string[]; filters: { key: string; options: string[]; defaults: string[] }[] };
type Actor = { id: string; label: string };

/** Kullanıcının kullanabildiği kaynaklar: modül etkin + kaynağın izni. */
export async function listSources(role: Role): Promise<SourceInfo[]> {
  const usable = new Set(await listUsableModuleKeys());
  return moduleRecipientRegistry
    .filter((entry) => usable.has(entry.moduleKey))
    .flatMap((entry) =>
      entry.sources
        .filter((source) => can(role, source.permission.definition, source.permission.action))
        .map((source) => ({
          id: `${entry.moduleKey}:${source.key}`,
          moduleKey: entry.moduleKey,
          key: source.key,
          placeholders: source.placeholders,
          filters: source.filters.map((filter) => ({ key: filter.key, options: filter.options, defaults: filter.defaults ?? [] })),
        })),
    );
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

export async function previewSource(role: Role, sourceId: string, filter: Record<string, string[]>) {
  const source = await findSource(role, sourceId);
  if (!source) return null;
  const list = await source.resolve(filter);
  const { eligible, noEmail, optOut } = split(list);
  return { matched: list.length, eligible: eligible.length, noEmail, optOut };
}

export async function sendTest(role: Role, input: { sourceId: string; filter: Record<string, string[]>; subject: string; body: string; to: string; toName: string }) {
  const source = await findSource(role, input.sourceId);
  if (!source) return null;
  const sample = split(await source.resolve(input.filter)).eligible[0];
  const vars = sample?.vars ?? source.sampleVars;
  return sendMail({ to: input.to, toName: input.toName, subject: `[Test] ${renderMailTemplate(input.subject, vars)}`, text: renderMailTemplate(input.body, vars), context: { module: "mailings", reference: "test" } });
}

/** Kaynaktan gönderim başlatır (arka planda). Uygun alıcı yoksa kayıt oluşturulmaz. */
export async function startCampaign(role: Role, input: { sourceId: string; filter: Record<string, string[]>; subject: string; body: string; actor: Actor }): Promise<{ id: string; recipients: number } | null> {
  const source = await findSource(role, input.sourceId);
  if (!source) return null;
  return createAndRun({ source: input.sourceId, filter: input.filter, subject: input.subject, body: input.body, actor: input.actor, list: await source.resolve(input.filter) });
}

/**
 * Programatik API (diğer modüller, erişim onayıyla): verilen alıcılara kişiye özel e-posta. İtiraz
 * edenler ve e-postasızlar atlanır; gönderim arka planda sürer, geçmişte "<modül>:api" kaynağıyla görünür.
 */
export async function sendBulkMail(input: { moduleKey: string; recipients: Recipient[]; subject: string; body: string; actor: Actor }): Promise<{ id: string; recipients: number }> {
  return createAndRun({ source: `${input.moduleKey}:api`, filter: {}, subject: input.subject, body: input.body, actor: input.actor, list: input.recipients });
}

async function createAndRun(input: { source: string; filter: Record<string, string[]>; subject: string; body: string; actor: Actor; list: Recipient[] }) {
  const { eligible, noEmail, optOut } = split(input.list);
  if (eligible.length === 0) return { id: "", recipients: 0 };
  const campaign = await getDb().mailingCampaign.create({
    data: {
      source: input.source,
      filter: input.filter as Prisma.InputJsonValue,
      subject: input.subject,
      body: input.body,
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

export async function listCampaigns() {
  return getDb().mailingCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export { isMailConfigured };
