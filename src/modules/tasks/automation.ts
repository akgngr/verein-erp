import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

/** Yeni görev. Başlık ve tarih yalnızca gönderim anında okunur. */
export const taskCreatedEvent = defineEvent({
  key: "tasks.created",
  description: "tasks.created",
  payloadSchema: z.object({
    taskId: z.string().min(1).max(128),
    priority: z.enum(["LOW", "NORMAL", "HIGH"]),
    hasDueDate: z.boolean(),
  }).strict(),
  variables: {
    namespace: "task",
    fields: ["title", "dueDate", "createdBy"],
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const task = await getDb().task.findUnique({ where: { id: payload.taskId }, select: { title: true, dueDate: true, createdByLabel: true } });
      if (!task) return {};
      return { title: task.title, dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null, createdBy: task.createdByLabel ?? null };
    },
  },
});

/**
 * Başka bir modülün onaylı sekreter önerisinden görev açar (ör. mail S4.1 #313 "görev taslağı").
 * Çağıran modül yetkiyi ve kullanıcı onayını denetlemiş olmalıdır; burada yalnız kayıt ve olay.
 */
export async function createTaskFromApprovedProposal(input: { title: string; createdById: string; createdByLabel: string }): Promise<{ id: string }> {
  const { getDb } = await import("@/shared/db");
  const { emitAutomationEvent } = await import("@/shared/automation/emit");
  const title = input.title.replace(/[\r\n]+/g, " ").trim().slice(0, 200) || "-";
  const created = await getDb().task.create({
    data: { title, status: "OPEN", priority: "NORMAL", createdById: input.createdById, createdByLabel: input.createdByLabel.slice(0, 200) },
    select: { id: true, priority: true, dueDate: true },
  });
  await emitAutomationEvent(taskCreatedEvent, { taskId: created.id, priority: created.priority, hasDueDate: created.dueDate !== null }).catch(() => false);
  return { id: created.id };
}
