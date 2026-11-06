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
