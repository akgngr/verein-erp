import "server-only";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import { defineModuleSecretary, defineSecretaryAction, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";

import { tasksPermissions } from "@/modules/tasks";
import { mailInboxPermissions } from "./permissions";
import { TRIAGE_SUGGESTION, type TriageCategory } from "./services/inbox-triage-rules";

/**
 * S4.1 (#313) — gelen posta sınıflaması sekreter katkısı.
 * Kapılar: kurum düzeyinde sınıflama açık (yönetici) + kullanıcı rızası (opt-in) + gelen kutusu görme yetkisi.
 * Öğe yalnız sınıf ve gönderen ADI taşır; adres, gövde ve özet gitmez. Öneriler yalnız TASLAK açar.
 */
export const TRIAGE_WINDOW_DAYS = 7;
const MAX_ITEMS = 20;
const payload = z.object({ inboxMessageId: z.string().min(1).max(64) }).strict();

export type TriageRow = { id: string; category: string; fromName: string | null; subject: string; receivedAt: Date };

/** Saf: satırlardan sekreter öğeleri (testlerde doğrudan kullanılır). */
export function buildTriageItems(rows: readonly TriageRow[], context: Pick<SecretaryContext, "t">): BriefingItem[] {
  return rows.slice(0, MAX_ITEMS).flatMap((row) => {
    const suggestion = TRIAGE_SUGGESTION[row.category as TriageCategory];
    if (!suggestion) return [];
    return [{
      id: `mail:triage:${row.id}`,
      module: "mail",
      kind: "triage",
      severity: "info" as const,
      title: context.t(`secretary.triage.${row.category}`),
      detail: row.subject.replace(/[\r\n]+/g, " ").slice(0, 80),
      dueAt: row.receivedAt.toISOString(),
      href: "/mail/gelen-kutusu",
      suggestion: { action: suggestion, payload: { inboxMessageId: row.id } },
    }];
  });
}

async function triageRows(userId: string, now: Date): Promise<TriageRow[]> {
  const { isTriageEnabled, hasTriageOptIn } = await import("./services/inbox-triage");
  if (!(await isTriageEnabled()) || !(await hasTriageOptIn(userId))) return [];
  const rows = await getDb().mailInboxMessage.findMany({
    where: {
      category: { in: Object.keys(TRIAGE_SUGGESTION) },
      receivedAt: { gte: new Date(now.getTime() - TRIAGE_WINDOW_DAYS * 86_400_000) },
      // Kullanıcının zaten taslak açtığı / görev oluşturduğu mesajlar tekrar önerilmez.
      replyDrafts: { none: { userId } },
      triageTasks: { none: { userId } },
    },
    orderBy: { receivedAt: "desc" },
    take: MAX_ITEMS,
    select: { id: true, category: true, fromName: true, subject: true, receivedAt: true },
  });
  return rows.map((row) => ({ ...row, category: row.category ?? "other" }));
}

/** Öneri hâlâ geçerli mi: mesaj var, sınıf aynı, kullanıcının taslağı/görevi yok. null → öneri yok/bayat. */
async function snapshotFor(inboxMessageId: string): Promise<unknown> {
  const row = await getDb().mailInboxMessage.findUnique({ where: { id: inboxMessageId }, select: { id: true, category: true } });
  return row?.category ? { id: row.id, category: row.category } : null;
}

async function userLabel(userId: string): Promise<string> {
  const { getUserById } = await import("@/modules/users/automation");
  const { buildUserLabel } = await import("@/shared/utils");
  const user = await getUserById(userId);
  return user ? buildUserLabel(user.name, user.email) : "-";
}

/** 1. onay: boş yanıt taslağı açar. Gönderim, gövdeyi kullanıcı yazdıktan sonra ayrı bir onaydır. */
export const replyDraftAction = defineSecretaryAction({
  key: "replyDraft",
  permission: { definition: mailInboxPermissions, action: "view" },
  risk: "internal",
  schema: payload,
  preview: async (_payload, context) => ({ title: context.t("secretary.replyDraftProposal"), detail: context.t("secretary.replyDraftProposalDetail") }),
  snapshot: async (input) => snapshotFor(input.inboxMessageId),
  editHref: () => "/mail/gelen-kutusu",
  execute: async (input, context) => {
    const { hasTriageOptIn } = await import("./services/inbox-triage");
    if (!(await hasTriageOptIn(context.user.id))) throw new Error("MAIL_TRIAGE_NOT_OPTED_IN");
    const { createReplyDraft } = await import("./services/inbox-drafts");
    const { writeAudit } = await import("@/shared/audit/write-audit");
    const draft = await createReplyDraft(input.inboxMessageId, context.user.id);
    if (draft.created) await writeAudit({ userId: context.user.id, action: "CREATE", entity: "MailReplyDraft", entityId: draft.id, after: { source: "secretary" } });
    return { href: "/mail/gelen-kutusu" };
  },
});

/** Görev taslağı: onayla yalnız AÇIK bir görev oluşturur (atama/tarih yok, dış eylem yok). */
export const taskDraftAction = defineSecretaryAction({
  key: "taskDraft",
  permission: { definition: tasksPermissions, action: "create" },
  risk: "internal",
  schema: payload,
  preview: async (_payload, context) => ({ title: context.t("secretary.taskDraftProposal"), detail: context.t("secretary.taskDraftProposalDetail") }),
  snapshot: async (input) => snapshotFor(input.inboxMessageId),
  editHref: () => "/mail/gelen-kutusu",
  execute: async (input, context) => {
    // Görev yetkisi eylemde; gelen kutusunu görme yetkisi ve rıza burada yeniden denetlenir.
    if (!can(context.user.role, mailInboxPermissions, "view")) throw new Error("MAIL_INBOX_FORBIDDEN");
    const { hasTriageOptIn } = await import("./services/inbox-triage");
    if (!(await hasTriageOptIn(context.user.id))) throw new Error("MAIL_TRIAGE_NOT_OPTED_IN");
    const db = getDb();
    const existing = await db.mailTriageTask.findUnique({ where: { inboxMessageId_userId: { inboxMessageId: input.inboxMessageId, userId: context.user.id } } });
    if (existing) return { href: "/tasks" };
    const message = await db.mailInboxMessage.findUnique({ where: { id: input.inboxMessageId }, select: { subject: true } });
    if (!message) throw new Error("MAIL_MESSAGE_NOT_FOUND");
    const { createTaskFromApprovedProposal } = await import("@/modules/tasks/automation");
    const task = await createTaskFromApprovedProposal({ title: message.subject, createdById: context.user.id, createdByLabel: await userLabel(context.user.id) });
    await db.mailTriageTask.create({ data: { inboxMessageId: input.inboxMessageId, userId: context.user.id, taskId: task.id } });
    const { writeAudit } = await import("@/shared/audit/write-audit");
    await writeAudit({ userId: context.user.id, action: "CREATE", entity: "Task", entityId: task.id, after: { source: "secretary", origin: "mail.triage" } });
    return { href: "/tasks" };
  },
});

export const secretary = defineModuleSecretary({
  module: "mail",
  providers: [{
    key: "triage",
    permission: { definition: mailInboxPermissions, action: "view" },
    collect: async (context) => buildTriageItems(await triageRows(context.user.id, context.now), context),
  }],
  actions: [replyDraftAction, taskDraftAction],
});
