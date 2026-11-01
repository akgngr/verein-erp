import "server-only";

import type { MemberStatus, MembershipType, Prisma } from "@prisma/client";

import { isMailConfigured, sendMail, sendMailBatch } from "@/modules/mail/server";
import { getDb } from "@/shared/db";

import { mailingVars, renderMailingTemplate } from "./bulk-mail-template";

export type MailingFilter = { statuses: MemberStatus[]; types: MembershipType[] };

function where(filter: MailingFilter): Prisma.MemberWhereInput {
  return {
    deletedAt: null,
    ...(filter.statuses.length ? { status: { in: filter.statuses } } : {}),
    ...(filter.types.length ? { type: { in: filter.types } } : {}),
  };
}

/** Alıcı özeti: filtreye uyan, e-postası olan ve itiraz etmemiş üyeler. */
export async function previewRecipients(filter: MailingFilter): Promise<{ matched: number; eligible: number; noEmail: number; optOut: number }> {
  const rows = await getDb().member.findMany({ where: where(filter), select: { email: true, bulkMailOptOut: true } });
  const noEmail = rows.filter((row) => !row.email).length;
  const optOut = rows.filter((row) => row.email && row.bulkMailOptOut).length;
  return { matched: rows.length, eligible: rows.length - noEmail - optOut, noEmail, optOut };
}

/** Test gönderimi: ilk uygun üyenin bilgileriyle doldurulmuş metin, yalnızca gönderen kullanıcıya. */
export async function sendMailingTest(input: { subject: string; body: string; filter: MailingFilter; to: string; toName: string }) {
  const sample = await getDb().member.findFirst({
    where: { ...where(input.filter), email: { not: null }, bulkMailOptOut: false },
    select: { firstName: true, lastName: true, membershipNumber: true },
  });
  const vars = mailingVars(sample ?? { firstName: input.toName, lastName: "", membershipNumber: "UYE-0000-0000" });
  return sendMail({
    to: input.to,
    toName: input.toName,
    subject: `[Test] ${renderMailingTemplate(input.subject, vars)}`,
    text: renderMailingTemplate(input.body, vars),
    context: { module: "members", reference: "mailing-test" },
  });
}

/**
 * Toplu gönderimi başlatır: kayıt oluşturulur, gönderim arka planda sürer (istek beklemez).
 * İlerleme members_mailings'te, alıcı başına sonuç mail_logs'ta görünür.
 */
export async function startMailing(input: { subject: string; body: string; filter: MailingFilter; actor: { id: string; label: string } }): Promise<{ id: string; recipients: number }> {
  const db = getDb();
  const rows = await db.member.findMany({
    where: where(input.filter),
    select: { id: true, email: true, bulkMailOptOut: true, firstName: true, lastName: true, membershipNumber: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const eligible = rows.filter((row) => row.email && !row.bulkMailOptOut);
  if (eligible.length === 0) return { id: "", recipients: 0 };
  const mailing = await db.memberMailing.create({
    data: {
      subject: input.subject,
      body: input.body,
      statuses: input.filter.statuses,
      types: input.filter.types,
      recipientCount: eligible.length,
      skippedNoEmail: rows.filter((row) => !row.email).length,
      skippedOptOut: rows.filter((row) => row.email && row.bulkMailOptOut).length,
      createdById: input.actor.id,
      createdByLabel: input.actor.label,
    },
    select: { id: true },
  });
  const messages = eligible.map((row) => {
    const vars = mailingVars(row);
    return {
      to: row.email as string,
      toName: vars.fullName,
      subject: renderMailingTemplate(input.subject, vars),
      text: renderMailingTemplate(input.body, vars),
      context: { module: "members", reference: mailing.id },
    };
  });
  void runMailing(mailing.id, messages);
  return { id: mailing.id, recipients: eligible.length };
}

async function runMailing(id: string, messages: Parameters<typeof sendMailBatch>[0]): Promise<void> {
  const db = getDb();
  try {
    const results = await sendMailBatch(messages);
    const sent = results.filter((result) => result.ok).length;
    await db.memberMailing.update({
      where: { id },
      data: { sentCount: sent, failedCount: results.length - sent, status: sent === 0 && results.length > 0 ? "FAILED" : "DONE", finishedAt: new Date() },
    });
  } catch (err) {
    console.error("[members] mailing failed:", err instanceof Error ? err.message : err);
    await db.memberMailing.update({ where: { id }, data: { status: "FAILED", finishedAt: new Date() } });
  }
}

export async function listMailings() {
  return getDb().memberMailing.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export { isMailConfigured };
