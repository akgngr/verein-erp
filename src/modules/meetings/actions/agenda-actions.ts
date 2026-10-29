"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";
import {
  agendaDiscussionUpdateSchema,
  agendaItemAddSchema,
  agendaItemDeleteSchema,
  agendaItemMoveSchema,
  agendaItemUpdateSchema,
} from "../schemas/agenda-item";
import { assertMeetingEditable } from "../services/meeting-guards";

/**
 * Gündem işlemleri (5. bölüm md. 7): pozisyon 1 tabanlı ve ardışıktır; ekleme
 * sona ekler; taşıma ve silme tek transaction'da yeniden numaralar.
 * Alt kayıtlar last-write-wins çalışır (5. bölüm md. 6 — KARAR).
 * Görüşme metni kendi action'ı ile kaydedilir; PLANNED ve HELD'de düzenlenebilir.
 */

export async function addAgendaItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: agendaItemAddSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await db.meeting.findFirst({
        where: { id: input.meetingId, deletedAt: null },
        select: { id: true, meetingNumber: true, status: true, deletedAt: true },
      });
      if (!meeting) throw new ActionError("meetings.errors.meetingNotFound");
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);

      const created = await db.$transaction(async (tx) => {
        const last = await tx.agendaItem.findFirst({
          where: { meetingId: meeting.id },
          orderBy: { position: "desc" },
          select: { position: true },
        });
        return tx.agendaItem.create({
          data: {
            meetingId: meeting.id,
            position: (last?.position ?? 0) + 1,
            title: input.title,
            description: input.description,
          },
        });
      });

      await audit({
        action: "AGENDA_ADD",
        entity: "AgendaItem",
        entityId: created.id,
        after: { meetingNumber: meeting.meetingNumber, position: created.position, title: created.title },
      });

      return { id: created.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function updateAgendaItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: agendaItemUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const item = await db.agendaItem.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          title: true,
          meetingId: true,
          meeting: {
            select: { meetingNumber: true, status: true, deletedAt: true },
          },
        },
      });
      if (!item) throw new ActionError("meetings.errors.agendaNotFound");
      assertMeetingEditable(item.meeting, "content", user.role, meetingsPermissions);

      await db.agendaItem.update({
        where: { id: item.id },
        data: { title: input.title, description: input.description },
      });

      await audit({
        action: "AGENDA_UPDATE",
        entity: "AgendaItem",
        entityId: item.id,
        after: { meetingNumber: item.meeting.meetingNumber, title: input.title },
      });

      return { id: item.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function deleteAgendaItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: agendaItemDeleteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const item = await db.agendaItem.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          meetingId: true,
          meeting: { select: { meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!item) throw new ActionError("meetings.errors.agendaNotFound");
      assertMeetingEditable(item.meeting, "content", user.role, meetingsPermissions);

      // KARAR: maddeye bağlı kararlar silinmez; agendaItemId SetNull ile boşalır
      // ve kararlar toplantı listesinde kalır (5. bölüm md. 7).
      await db.$transaction(async (tx) => {
        await tx.agendaItem.delete({ where: { id: item.id } });
        const remaining = await tx.agendaItem.findMany({
          where: { meetingId: item.meetingId },
          orderBy: { position: "asc" },
          select: { id: true },
        });
        let position = 1;
        for (const remainingItem of remaining) {
          await tx.agendaItem.update({
            where: { id: remainingItem.id },
            data: { position: position++ },
          });
        }
      });

      await audit({
        action: "AGENDA_DELETE",
        entity: "AgendaItem",
        entityId: item.id,
        before: { meetingNumber: item.meeting.meetingNumber },
      });

      return { id: item.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function moveAgendaItemAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: agendaItemMoveSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const item = await db.agendaItem.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          position: true,
          meetingId: true,
          meeting: { select: { meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!item) throw new ActionError("meetings.errors.agendaNotFound");
      assertMeetingEditable(item.meeting, "content", user.role, meetingsPermissions);

      await db.$transaction(async (tx) => {
        const siblings = await tx.agendaItem.findMany({
          where: { meetingId: item.meetingId },
          orderBy: { position: "asc" },
          select: { id: true, position: true },
        });
        const index = siblings.findIndex((sibling) => sibling.id === item.id);
        const targetIndex = input.direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= siblings.length) {
          throw new ActionError("meetings.errors.agendaCannotMove");
        }
        // KARAR: konumlar swap edilir; ardışıklık korunur (5. bölüm md. 7).
        const target = siblings[targetIndex];
        await tx.agendaItem.update({
          where: { id: item.id },
          data: { position: target.position },
        });
        await tx.agendaItem.update({
          where: { id: target.id },
          data: { position: item.position },
        });
      });

      await audit({
        action: "AGENDA_MOVE",
        entity: "AgendaItem",
        entityId: item.id,
        after: { meetingNumber: item.meeting.meetingNumber, direction: input.direction },
      });

      return { id: item.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function updateAgendaDiscussionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: agendaDiscussionUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const item = await db.agendaItem.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          meeting: { select: { meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!item) throw new ActionError("meetings.errors.agendaNotFound");
      // KARAR: görüşme metni PLANNED ve HELD'de düzenlenebilir (5. bölüm md. 7).
      assertMeetingEditable(item.meeting, "content", user.role, meetingsPermissions);

      await db.agendaItem.update({
        where: { id: item.id },
        data: { discussion: input.discussion },
      });

      // KARAR: görüşme metninin TAMAMI loglanmaz; yalnızca uzunluk (10. bölüm).
      await audit({
        action: "AGENDA_DISCUSSION",
        entity: "AgendaItem",
        entityId: item.id,
        after: {
          meetingNumber: item.meeting.meetingNumber,
          discussionLength: input.discussion?.length ?? 0,
        },
      });

      return { id: item.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}
