import "server-only";

import { getDb } from "@/shared/db";
import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";

import { documentsPermissions } from "./permissions";
import { berlinToday } from "./utils";

/** "Yaklaşan" ufku: bugün dahil 3 gün. */
export const DOCUMENT_DUE_SOON_DAYS = 3;

export type DocumentsSnapshot = { overdue: number; dueSoon: number; nextDueAt: Date | null };

/** Açık evrak son tarihleri. Yalnız sayı; kayıt numarası/konu özete taşınmaz. */
export function buildDocumentItems(snapshot: DocumentsSnapshot, context: Pick<SecretaryContext, "t">, today: Date): BriefingItem[] {
  const { t } = context;
  const items: BriefingItem[] = [];
  if (snapshot.overdue > 0) {
    items.push({
      id: "documents:overdue",
      module: "documents",
      kind: "overdue",
      severity: "danger",
      title: t("secretary.overdue", { count: snapshot.overdue }),
      count: snapshot.overdue,
      dueAt: today.toISOString().slice(0, 10),
      href: "/evrak",
    });
  }
  if (snapshot.dueSoon > 0) {
    items.push({
      id: "documents:due-soon",
      module: "documents",
      kind: "due-soon",
      severity: "warning",
      title: t("secretary.dueSoon", { count: snapshot.dueSoon, days: DOCUMENT_DUE_SOON_DAYS }),
      count: snapshot.dueSoon,
      ...(snapshot.nextDueAt ? { dueAt: snapshot.nextDueAt.toISOString().slice(0, 10) } : {}),
      href: "/evrak",
    });
  }
  return items;
}

async function loadSnapshot(today: Date): Promise<DocumentsSnapshot> {
  const db = getDb();
  const open = { status: { in: ["OPEN" as const, "IN_PROGRESS" as const] }, deletedAt: null };
  const until = new Date(today.getTime() + DOCUMENT_DUE_SOON_DAYS * 86_400_000);
  const [overdue, dueSoon, next] = await Promise.all([
    db.document.count({ where: { ...open, dueDate: { lt: today } } }),
    db.document.count({ where: { ...open, dueDate: { gte: today, lt: until } } }),
    db.document.findFirst({ where: { ...open, dueDate: { gte: today, lt: until } }, select: { dueDate: true }, orderBy: { dueDate: "asc" } }),
  ]);
  return { overdue, dueSoon, nextDueAt: next?.dueDate ?? null };
}

export const secretary = defineModuleSecretary({
  module: "documents",
  providers: [{
    key: "deadlines",
    permission: { definition: documentsPermissions, action: "view" },
    collect: async (context) => {
      const today = berlinToday(context.now);
      return buildDocumentItems(await loadSnapshot(today), context, today);
    },
  }],
});
