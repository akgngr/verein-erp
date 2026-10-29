"use server";

import { ActionError, createAction } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { tasksPermissions } from "../permissions";
import {
  taskCompleteSchema,
  taskDeleteSchema,
  taskSchema,
  taskUpdateSchema,
} from "../schemas/item-schema";
import { parseDateOnly } from "../utils";

/** Görev oluşturma: yetki, şema ve üye anlık görüntüsü kaydedilir. */
export async function createTaskAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: tasksPermissions, action: "create" },
    schema: taskSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      let memberName: string | null = null;

      if (input.memberId) {
        const member = await db.member.findUnique({
          where: { id: input.memberId },
          select: { firstName: true, lastName: true },
        });
        if (member) {
          memberName = `${member.firstName} ${member.lastName}`.trim();
        }
      }

      const isDone = input.status === "DONE";
      const userLabel = buildUserLabel(user.name, user.email);

      const created = await db.task.create({
        data: {
          title: input.title,
          description: input.description ?? null,
          status: input.status,
          priority: input.priority,
          dueDate: parseDateOnly(input.dueDate),
          memberId: input.memberId ?? null,
          memberName,
          meetingId: input.meetingId ?? null,
          completedAt: isDone ? new Date() : null,
          completedById: isDone ? user.id : null,
          completedByLabel: isDone ? userLabel : null,
          createdById: user.id,
          createdByLabel: userLabel,
        },
      });

      await audit({
        action: "CREATE",
        entity: "Task",
        entityId: created.id,
        after: {
          title: created.title,
          status: created.status,
          priority: created.priority,
          memberName: created.memberName,
        },
      });

      return { id: created.id };
    },
  });
  return run(input);
}

/** Görev güncelleme: durum DONE olursa tamamlanma bilgisi eklenir; DONE'dan çıkarsa temizlenir. */
export async function updateTaskAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: tasksPermissions, action: "update" },
    schema: taskUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const existing = await db.task.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("tasks.errors.notFound");

      let memberName = existing.memberName;
      if (input.memberId !== existing.memberId) {
        if (input.memberId) {
          const member = await db.member.findUnique({
            where: { id: input.memberId },
            select: { firstName: true, lastName: true },
          });
          memberName = member ? `${member.firstName} ${member.lastName}`.trim() : null;
        } else {
          memberName = null;
        }
      }

      const isNowDone = input.status === "DONE";
      const wasDone = existing.status === "DONE";
      const userLabel = buildUserLabel(user.name, user.email);

      let completedAt = existing.completedAt;
      let completedById = existing.completedById;
      let completedByLabel = existing.completedByLabel;

      if (isNowDone && !wasDone) {
        completedAt = new Date();
        completedById = user.id;
        completedByLabel = userLabel;
      } else if (!isNowDone && wasDone) {
        completedAt = null;
        completedById = null;
        completedByLabel = null;
      }

      const updated = await db.task.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          description: input.description ?? null,
          status: input.status,
          priority: input.priority,
          dueDate: parseDateOnly(input.dueDate),
          memberId: input.memberId ?? null,
          memberName,
          meetingId: input.meetingId ?? null,
          completedAt,
          completedById,
          completedByLabel,
        },
      });

      await audit({
        action: "UPDATE",
        entity: "Task",
        entityId: updated.id,
        before: {
          title: existing.title,
          status: existing.status,
          priority: existing.priority,
        },
        after: {
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
        },
      });

      return { id: updated.id };
    },
  });
  return run(input);
}

/** Satır içi hızlı eylem: "Tamamlandı" olarak işaretle. */
export async function completeTaskAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: tasksPermissions, action: "update" },
    schema: taskCompleteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const existing = await db.task.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("tasks.errors.notFound");

      const userLabel = buildUserLabel(user.name, user.email);
      const isReopen = existing.status === "DONE";
      const newStatus = isReopen ? "OPEN" : "DONE";

      const updated = await db.task.update({
        where: { id: existing.id },
        data: {
          status: newStatus,
          completedAt: isReopen ? null : new Date(),
          completedById: isReopen ? null : user.id,
          completedByLabel: isReopen ? null : userLabel,
        },
      });

      await audit({
        action: "UPDATE",
        entity: "Task",
        entityId: updated.id,
        before: { status: existing.status },
        after: { status: updated.status },
      });

      return { id: updated.id };
    },
  });
  return run(input);
}

/** Görev silme. */
export async function deleteTaskAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: tasksPermissions, action: "delete" },
    schema: taskDeleteSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.task.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("tasks.errors.notFound");

      await db.task.delete({ where: { id: existing.id } });
      await audit({
        action: "DELETE",
        entity: "Task",
        entityId: existing.id,
        before: { title: existing.title, status: existing.status },
      });

      return { id: existing.id };
    },
  });
  return run(input);
}
