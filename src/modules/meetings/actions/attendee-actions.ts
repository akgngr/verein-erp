"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction, listActiveUserOptions } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";
import {
  attendeeAddGuestSchema,
  attendeeAddUsersSchema,
  attendeeMarkAllPresentSchema,
  attendeeRemoveSchema,
  attendeeUpdateSchema,
} from "../schemas/attendee";
import { assertMeetingEditable } from "../services/meeting-guards";

/**
 * Katılımcı işlemleri (5. bölüm md. 8): kullanıcılar listActiveUserOptions'tan
 * çoklu eklenir; konuk serbest metinle girilir; toplantı başına en fazla bir
 * Başkan ve bir Sekreter olabilir.
 */

async function loadMeetingForUpdate(meetingId: string) {
  const db = getDb();
  const meeting = await db.meeting.findFirst({
    where: { id: meetingId, deletedAt: null },
    select: { id: true, meetingNumber: true, status: true, deletedAt: true },
  });
  if (!meeting) throw new ActionError("meetings.errors.meetingNotFound");
  return meeting;
}

export async function addAttendeeUsersAction(
  input: unknown,
): Promise<ActionResult<{ added: number }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: attendeeAddUsersSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await loadMeetingForUpdate(input.meetingId);
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);

      // KARAR: seçimler istemciden gelse de ad, sunucuda kullanıcı kaydından
      // yeniden okunur (anlık görüntü doğruluğu); pasif kullanıcı reddedilir.
      const activeUsers = await listActiveUserOptions();
      const activeById = new Map(activeUsers.map((option) => [option.id, option.label]));

      const existing = await db.meetingAttendee.findMany({
        where: { meetingId: meeting.id },
        select: { userId: true, role: true },
      });
      const existingUserIds = new Set(existing.map((attendee) => attendee.userId));
      let hasChairperson = existing.some((attendee) => attendee.role === "CHAIRPERSON");
      let hasSecretary = existing.some((attendee) => attendee.role === "SECRETARY");

      const rows: { userId: string; name: string; role: "CHAIRPERSON" | "SECRETARY" | "MEMBER" | "GUEST" }[] = [];
      for (const userId of input.userIds) {
        if (existingUserIds.has(userId)) continue; // bir kullanıcı toplantıya bir kez eklenir
        const label = activeById.get(userId);
        if (!label) {
          throw new ActionError("meetings.errors.userNotFound");
        }
        if (input.role === "CHAIRPERSON" && hasChairperson) {
          throw new ActionError("meetings.errors.chairExists");
        }
        if (input.role === "SECRETARY" && hasSecretary) {
          throw new ActionError("meetings.errors.secretaryExists");
        }
        // KARAR: aynı toplu ekleme içinde de tek başkan/sekreter kuralı korunur.
        if (input.role === "CHAIRPERSON") {
          hasChairperson = true;
        } else if (input.role === "SECRETARY") {
          hasSecretary = true;
        }
        rows.push({ userId, name: label, role: input.role });
      }
      if (rows.length === 0) {
        throw new ActionError("meetings.errors.usersAlreadyAdded");
      }

      await db.meetingAttendee.createMany({
        data: rows.map((row) => ({
          meetingId: meeting.id,
          userId: row.userId,
          name: row.name,
          role: row.role,
          attendance: "INVITED" as const,
        })),
      });

      await audit({
        action: "ATTENDEE_ADD",
        entity: "MeetingAttendee",
        entityId: meeting.id,
        after: { meetingNumber: meeting.meetingNumber, addedUsers: rows.length, role: input.role },
      });

      return { added: rows.length };
    },
  });

  return run(input) as Promise<ActionResult<{ added: number }>>;
}

export async function addAttendeeGuestAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: attendeeAddGuestSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await loadMeetingForUpdate(input.meetingId);
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);

      const created = await db.meetingAttendee.create({
        data: {
          meetingId: meeting.id,
          userId: null,
          name: input.name,
          role: input.role,
          attendance: "INVITED",
        },
      });

      await audit({
        action: "ATTENDEE_ADD",
        entity: "MeetingAttendee",
        entityId: created.id,
        after: { meetingNumber: meeting.meetingNumber, guest: input.name, role: input.role },
      });

      return { id: created.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function updateAttendeeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: attendeeUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const attendee = await db.meetingAttendee.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          role: true,
          meeting: { select: { id: true, meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!attendee) throw new ActionError("meetings.errors.attendeeNotFound");
      assertMeetingEditable(attendee.meeting, "content", user.role, meetingsPermissions);

      // KARAR: en fazla bir Başkan ve bir Sekreter — başka katılımcıda aynı rol
      // varsa geçiş reddedilir (5. bölüm md. 8).
      if (
        (input.role === "CHAIRPERSON" || input.role === "SECRETARY") &&
        attendee.role !== input.role
      ) {
        const clash = await db.meetingAttendee.findFirst({
          where: { meetingId: attendee.meeting.id, role: input.role, id: { not: attendee.id } },
          select: { id: true },
        });
        if (clash) {
          throw new ActionError(
            input.role === "CHAIRPERSON"
              ? "meetings.errors.chairExists"
              : "meetings.errors.secretaryExists",
          );
        }
      }

      await db.meetingAttendee.update({
        where: { id: attendee.id },
        data: { role: input.role, attendance: input.attendance, note: input.note },
      });

      await audit({
        action: "ATTENDEE_UPDATE",
        entity: "MeetingAttendee",
        entityId: attendee.id,
        after: {
          meetingNumber: attendee.meeting.meetingNumber,
          role: input.role,
          attendance: input.attendance,
        },
      });

      return { id: attendee.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function removeAttendeeAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: attendeeRemoveSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const attendee = await db.meetingAttendee.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          meeting: { select: { meetingNumber: true, status: true, deletedAt: true } },
        },
      });
      if (!attendee) throw new ActionError("meetings.errors.attendeeNotFound");
      assertMeetingEditable(attendee.meeting, "content", user.role, meetingsPermissions);

      await db.meetingAttendee.delete({ where: { id: attendee.id } });

      await audit({
        action: "ATTENDEE_REMOVE",
        entity: "MeetingAttendee",
        entityId: attendee.id,
        before: { meetingNumber: attendee.meeting.meetingNumber, name: attendee.name },
      });

      return { id: attendee.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function markAllAttendeesPresentAction(
  input: unknown,
): Promise<ActionResult<{ updated: number }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: attendeeMarkAllPresentSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await loadMeetingForUpdate(input.meetingId);
      assertMeetingEditable(meeting, "content", user.role, meetingsPermissions);

      // KARAR: yalnızca INVITED katılımcılar PRESENT'e çekilir; Mazeretli/Katılmadı korunur.
      const result = await db.meetingAttendee.updateMany({
        where: { meetingId: meeting.id, attendance: "INVITED" },
        data: { attendance: "PRESENT" },
      });

      await audit({
        action: "ATTENDEE_MARK_ALL",
        entity: "MeetingAttendee",
        entityId: meeting.id,
        after: { meetingNumber: meeting.meetingNumber, updated: result.count },
      });

      return { updated: result.count };
    },
  });

  return run(input) as Promise<ActionResult<{ updated: number }>>;
}
