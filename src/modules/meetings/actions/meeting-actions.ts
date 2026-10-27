"use server";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";
import { meetingCreateSchema, meetingUpdateSchema } from "../schemas/meeting";
import { allocateMeetingNumber, runWithNumberRetry } from "../services/meeting-number";
import { berlinYear, parseDateOnly } from "../utils";

const CREATE_SCHEMA = meetingCreateSchema;
const UPDATE_SCHEMA = meetingUpdateSchema.extend({ id: z.string().min(1) });
const DELETE_SCHEMA = z.object({ id: z.string().min(1) });

/** Audit `changes` içine yansıtılacak alanlar (yalnızca değişenler, 10. bölüm). */
const TRACKED_FIELDS = [
  "title",
  "meetingDate",
  "startTime",
  "endTime",
  "location",
  "quorumRequired",
  "description",
] as const;

type TrackedKey = (typeof TRACKED_FIELDS)[number];

function isoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/**
 * Yeni toplantı (5. bölüm md. 1 ve 11): numara TOP-<yıl>-<sıra> atomik üretilir;
 * yıl, meetingDate'in Europe/Berlin yılıdır. Numara sonradan değiştirilemez —
 * update şemasında meetingNumber yoktur; meetingDate sonradan başka yıla
 * kayarsa bile numara DEĞİŞMEZ (KARAR: numara üretim anına bağlıdır).
 */
export async function createMeetingAction(
  input: unknown,
): Promise<ActionResult<{ id: string; meetingNumber: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "create" },
    schema: CREATE_SCHEMA,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      const meetingDate = parseDateOnly(input.meetingDate);
      if (!meetingDate) {
        throw new ActionError("Toplantı tarihi geçersiz.", {
          meetingDate: ["Geçerli bir toplantı tarihi girin."],
        });
      }
      const year = berlinYear(meetingDate);

      // Kopyalama kaynağı (5. bölüm md. 11): aynı türden, silinmemiş toplantı.
      let copyAttendees: { userId: string | null; name: string; role: "CHAIRPERSON" | "SECRETARY" | "MEMBER" | "GUEST" }[] = [];
      let copyAgenda: { title: string; description: string | null }[] = [];
      if (input.copyFromMeetingId) {
        const source = await db.meeting.findFirst({
          where: { id: input.copyFromMeetingId, deletedAt: null, type: input.type },
          select: { id: true },
        });
        if (!source) {
          throw new ActionError("Kopyalanacak toplantı bulunamadı veya türü farklı.", {
            copyFromMeetingId: ["Geçerli bir önceki toplantı seçin."],
          });
        }
        // KARAR: MeetingAttendee'nin User ile ilişkisi YOKTUR (4. bölüm: düz userId);
        // aktiflik filtresi kullanıcı tablosu ayrı çekilerek uygulanır.
        const [sourceAttendees, activeUsers] = await Promise.all([
          db.meetingAttendee.findMany({
            where: { meetingId: source.id },
            select: { userId: true, name: true, role: true },
          }),
          db.user.findMany({ where: { isActive: true }, select: { id: true } }),
        ]);
        const activeIds = new Set(activeUsers.map((activeUser) => activeUser.id));
        copyAttendees = sourceAttendees
          // KARAR: kullanıcı katılımcıları yalnızca kullanıcı hâlâ aktifse kopyalanır;
          // konuklar her zaman korunur (5. bölüm md. 11).
          .filter((attendee) => !attendee.userId || activeIds.has(attendee.userId))
          .map((attendee) => ({
            userId: attendee.userId,
            name: attendee.name,
            role: attendee.role as "CHAIRPERSON" | "SECRETARY" | "MEMBER" | "GUEST",
          }));
        const sourceAgenda = await db.agendaItem.findMany({
          where: { meetingId: source.id },
          orderBy: { position: "asc" },
          select: { title: true, description: true },
        });
        copyAgenda = sourceAgenda;
      }

      const createdByLabel = buildUserLabel(user.name, user.email);

      const created = await runWithNumberRetry(() =>
        db.$transaction(async (tx) => {
          const { sequence, meetingNumber } = await allocateMeetingNumber(tx, year);
          return tx.meeting.create({
            data: {
              year,
              sequence,
              meetingNumber,
              type: input.type,
              title: input.title,
              meetingDate,
              startTime: input.startTime,
              endTime: input.endTime,
              location: input.location,
              description: input.description,
              quorumRequired: input.quorumRequired,
              createdById: user.id,
              createdByLabel,
              updatedById: user.id,
              updatedByLabel: createdByLabel,
              ...(copyAgenda.length > 0
                ? {
                    agendaItems: {
                      create: copyAgenda.map((item, index) => ({
                        position: index + 1,
                        title: item.title,
                        // KARAR: discussion ASLA kopyalanmaz; yalnızca başlık ve
                        // planlanan içerik taşınır (5. bölüm md. 11).
                        description: item.description,
                      })),
                    },
                  }
                : {}),
              ...(copyAttendees.length > 0
                ? {
                    attendees: {
                      create: copyAttendees.map((attendee) => ({
                        userId: attendee.userId,
                        name: attendee.name,
                        role: attendee.role,
                        // KARAR: katılım kopyalanmaz, herkes INVITED başlar (5. bölüm md. 11).
                        attendance: "INVITED" as const,
                      })),
                    },
                  }
                : {}),
            },
          });
        }),
      );

      await audit({
        action: "CREATE",
        entity: "Meeting",
        entityId: created.id,
        after: {
          meetingNumber: created.meetingNumber,
          type: created.type,
          title: created.title,
          meetingDate: created.meetingDate.toISOString().slice(0, 10),
          copyFromMeetingId: input.copyFromMeetingId ?? null,
        },
      });

      return { id: created.id, meetingNumber: created.meetingNumber };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; meetingNumber: string }>>;
}

/**
 * Toplantı düzenleme (5. bölüm md. 4 ve 6): yalnızca PLANNED/HELD'de; ana form
 * eşzamanlılık denetimi updatedAt ile yapılır; numara ve yıl güncellenmez.
 */
export async function updateMeetingAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "update" },
    schema: UPDATE_SCHEMA,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const meeting = await db.meeting.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!meeting) throw new ActionError("Toplantı bulunamadı.");

      if (meeting.status !== "PLANNED" && meeting.status !== "HELD") {
        throw new ActionError("Onaylanmış toplantı tutanağı düzenlenemez. Önce yeniden açın.");
      }

      if (new Date(input.updatedAt).getTime() !== meeting.updatedAt.getTime()) {
        throw new ActionError(
          "Bu kayıt başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.",
        );
      }

      const meetingDate = parseDateOnly(input.meetingDate);
      if (!meetingDate) {
        throw new ActionError("Toplantı tarihi geçersiz.", {
          meetingDate: ["Geçerli bir toplantı tarihi girin."],
        });
      }

      const updated = await db.meeting.update({
        where: { id: meeting.id },
        data: {
          // KARAR: yıl ve numara güncellenmez; meetingDate başka yıla kayarsa
          // numara olduğu gibi kalır (5. bölüm md. 1).
          title: input.title,
          meetingDate,
          startTime: input.startTime,
          endTime: input.endTime,
          location: input.location,
          quorumRequired: input.quorumRequired,
          description: input.description,
          updatedById: user.id,
          updatedByLabel: buildUserLabel(user.name, user.email),
        },
      });

      // Audit: before/after YALNIZCA değişen alanları içerir + meetingNumber (10. bölüm).
      const previous: Record<string, unknown> = { meetingNumber: meeting.meetingNumber };
      const next: Record<string, unknown> = { meetingNumber: meeting.meetingNumber };
      const current: Record<TrackedKey, unknown> = {
        title: meeting.title,
        meetingDate: isoDate(meeting.meetingDate),
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        quorumRequired: meeting.quorumRequired,
        description: meeting.description,
      };
      const incoming: Record<TrackedKey, unknown> = {
        title: updated.title,
        meetingDate: isoDate(updated.meetingDate),
        startTime: updated.startTime,
        endTime: updated.endTime,
        location: updated.location,
        quorumRequired: updated.quorumRequired,
        description: updated.description,
      };
      for (const field of TRACKED_FIELDS) {
        if (current[field] !== incoming[field]) {
          previous[field] = current[field];
          next[field] = incoming[field];
        }
      }

      await audit({
        action: "UPDATE",
        entity: "Meeting",
        entityId: updated.id,
        before: previous,
        after: next,
      });

      return { id: updated.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

/**
 * Toplantı silme (5. bölüm md. 5): yalnızca ADMIN (delete yetkisi), yalnızca
 * APPROVED değilken; yumuşak silme; numaralar yeniden kullanılmaz; diskteki
 * dosyalara dokunulmaz.
 */
export async function deleteMeetingAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: meetingsPermissions, action: "delete" },
    schema: DELETE_SCHEMA,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      const meeting = await db.meeting.findFirst({
        where: { id: input.id, deletedAt: null },
        select: { id: true, meetingNumber: true, status: true },
      });
      if (!meeting) {
        throw new ActionError("Toplantı bulunamadı.");
      }
      if (meeting.status === "APPROVED") {
        throw new ActionError("Onaylanmış toplantı silinemez. Önce yeniden açın.");
      }

      await db.meeting.update({
        where: { id: meeting.id },
        data: {
          deletedAt: new Date(),
          deletedById: user.id,
          deletedByLabel: buildUserLabel(user.name, user.email),
        },
      });

      await audit({
        action: "DELETE",
        entity: "Meeting",
        entityId: meeting.id,
        before: { meetingNumber: meeting.meetingNumber, status: meeting.status },
      });

      return { id: meeting.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}
