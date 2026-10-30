"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction, listActiveUserOptions } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";
import {
  actionItemAddSchema,
  actionItemDeleteSchema,
  actionItemSetStatusSchema,
  actionItemUpdateSchema,
} from "../schemas/action-item";
import { assertMeetingEditable } from "../services/meeting-guards";
import { parseDateOnly } from "../utils";

/**
 * Görev işlemleri (5. bölüm md. 4 ve 10): ekleme/güncelleme/silme yalnızca
 * PLANNED/HELD'de; durum değişikliği (Tamamlandı/Yeniden aç) ONAYLI
 * toplantıda da çalışır (takip onay sonrası sürer).
 * Sorumlu YA kullanıcı YA serbest metin YA hiçbiri.
 */

export async function addActionItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: actionItemAddSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await db.meeting.findFirst({
        where: { id: input.meetingId, deletedAt: null },
        select: { id: true, meetingNumber: true, status: true, deletedAt: true },
      });
      if (!meeting) throw new ActionError("meetings.errors.meetingNotFound");
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);

      // KARAR: bağlı karar aynı toplantıya ait olmalıdır (5. bölüm md. 10).
      if (input.decisionId) {
        const decision = await db.meetingDecision.findFirst({
          where: { id: input.decisionId, meetingId: meeting.id },
          select: { id: true },
        });
        if (!decision) {
          throw new ActionError("meetings.errors.decisionNotFound", {
            decisionId: ["Geçerli bir karar seçin."],
          });
        }
      }

      let assigneeLabel: string | null = null;
      if (input.assigneeId) {
        const assignee = (await listActiveUserOptions()).find((option) => option.id === input.assigneeId);
        if (!assignee) {
          throw new ActionError("meetings.errors.assigneeNotFound", {
            assigneeId: ["Geçerli bir sorumlu seçin."],
          });
        }
        assigneeLabel = assignee.label;
      } else if (input.assigneeName) {
        assigneeLabel = input.assigneeName;
      }

      const dueDate = input.dueDate ? parseDateOnly(input.dueDate) : null;

      const created = await db.actionItem.create({
        data: {
          meetingId: meeting.id,
          decisionId: input.decisionId,
          description: input.description,
          assigneeId: input.assigneeId,
          assigneeLabel,
          dueDate,
        },
      });

      await audit({
        action: "ACTION_ADD",
        entity: "ActionItem",
        entityId: created.id,
        after: { meetingNumber: meeting.meetingNumber, assigneeLabel },
      });

      return { id: created.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function updateActionItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: actionItemUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const actionItem = await db.actionItem.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          meetingId: true,
          meeting: { select: { id: true, meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!actionItem) throw new ActionError("meetings.errors.taskNotFound");
      assertMeetingEditable(actionItem.meeting, "content", user.role, meetingsPermissions);

      if (input.decisionId) {
        const decision = await db.meetingDecision.findFirst({
          where: { id: input.decisionId, meetingId: actionItem.meetingId },
          select: { id: true },
        });
        if (!decision) {
          throw new ActionError("meetings.errors.decisionNotFound", {
            decisionId: ["Geçerli bir karar seçin."],
          });
        }
      }

      let assigneeLabel: string | null = null;
      if (input.assigneeId) {
        const assignee = (await listActiveUserOptions()).find((option) => option.id === input.assigneeId);
        if (!assignee) {
          throw new ActionError("meetings.errors.assigneeNotFound", {
            assigneeId: ["Geçerli bir sorumlu seçin."],
          });
        }
        assigneeLabel = assignee.label;
      } else if (input.assigneeName) {
        assigneeLabel = input.assigneeName;
      }

      const dueDate = input.dueDate ? parseDateOnly(input.dueDate) : null;

      await db.actionItem.update({
        where: { id: actionItem.id },
        data: {
          decisionId: input.decisionId,
          description: input.description,
          assigneeId: input.assigneeId,
          assigneeLabel,
          dueDate,
        },
      });

      await audit({
        action: "ACTION_UPDATE",
        entity: "ActionItem",
        entityId: actionItem.id,
        after: { meetingNumber: actionItem.meeting.meetingNumber, assigneeLabel },
      });

      return { id: actionItem.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function setActionItemStatusAction(
  input: unknown,
): Promise<ActionResult<{ id: string; status: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: actionItemSetStatusSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const actionItem = await db.actionItem.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          status: true,
          meeting: { select: { meetingNumber: true, deletedAt: true } },
        },
      });
      if (!actionItem) throw new ActionError("meetings.errors.taskNotFound");
      // KARAR: actionStatus kapsamı her durumda izinlidir; yalnızca yumuşak
      // silinmiş toplantıda engellenir (5. bölüm md. 4).
      if (actionItem.meeting.deletedAt) {
        throw new ActionError("meetings.errors.meetingNotFound");
      }
      if (actionItem.status === input.status) {
        return { id: actionItem.id, status: input.status };
      }

      const userLabel = buildUserLabel(user.name, user.email);
      await db.actionItem.update({
        where: { id: actionItem.id },
        data:
          input.status === "DONE"
            ? {
                status: "DONE",
                completedAt: new Date(),
                completedById: user.id,
                completedByLabel: userLabel,
              }
            : {
                status: "OPEN",
                completedAt: null,
                completedById: null,
                completedByLabel: null,
              },
      });

      await audit({
        action: "ACTION_STATUS",
        entity: "ActionItem",
        entityId: actionItem.id,
        before: { meetingNumber: actionItem.meeting.meetingNumber, status: actionItem.status },
        after: { meetingNumber: actionItem.meeting.meetingNumber, status: input.status },
      });

      return { id: actionItem.id, status: input.status };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; status: string }>>;
}

export async function deleteActionItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: actionItemDeleteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const actionItem = await db.actionItem.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          meeting: { select: { meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!actionItem) throw new ActionError("meetings.errors.taskNotFound");
      assertMeetingEditable(actionItem.meeting, "content", user.role, meetingsPermissions);

      await db.actionItem.delete({ where: { id: actionItem.id } });

      await audit({
        action: "ACTION_DELETE",
        entity: "ActionItem",
        entityId: actionItem.id,
        before: { meetingNumber: actionItem.meeting.meetingNumber },
      });

      return { id: actionItem.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}
