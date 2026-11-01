import "server-only";

import type { FeedbackStatus, FeedbackType } from "@prisma/client";

import { getDb } from "@/shared/db";

/** Yönetici tümünü, diğerleri yalnızca kendi kayıtlarını görür. */
export async function listFeedback(input: { userId: string; all: boolean; status?: FeedbackStatus; type?: FeedbackType }) {
  const db = getDb();
  const where = { ...(input.all ? {} : { reporterId: input.userId }), ...(input.status ? { status: input.status } : {}), ...(input.type ? { type: input.type } : {}) };
  const [items, grouped] = await Promise.all([
    db.feedbackItem.findMany({ where, orderBy: [{ createdAt: "desc" }], take: 500, select: { id: true, number: true, type: true, status: true, priority: true, title: true, pageUrl: true, reporterLabel: true, createdAt: true, adminReply: true } }),
    db.feedbackItem.groupBy({ by: ["status"], _count: { _all: true }, where: input.all ? {} : { reporterId: input.userId } }),
  ]);
  const counts: Record<FeedbackStatus, number> = { NEW: 0, IN_PROGRESS: 0, DONE: 0, REJECTED: 0 };
  for (const group of grouped) counts[group.status] = group._count._all;
  return { items, counts };
}

export async function getFeedback(id: string, input: { userId: string; all: boolean }) {
  const item = await getDb().feedbackItem.findUnique({ where: { id } });
  if (!item || (!input.all && item.reporterId !== input.userId)) return null;
  return item;
}
