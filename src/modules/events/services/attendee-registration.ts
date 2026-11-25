import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";

/**
 * #584: Katılımcı kaydı ve yeniden etkinleştirme tek bir transaction içinde, etkinlik başına bir PostgreSQL
 * advisory lock ile sıralanır. Böylece aynı anda gelen iki kayıt kontenjanı aşamaz ve aynı üye bir etkinliğe
 * iki kez (iptal edilmemiş) kaydolamaz. Yönetici eylemi ve üye portalı aynı servisi kullanır.
 *
 * KARAR: Benzersizlik veritabanı kısıtı yerine kilitle sağlanır; iptal edilmiş kayıttan sonra yeniden kayıt
 * mümkün olmalıdır ve misafir katılımcılarda `memberId` boştur (koşullu benzersizlik Prisma şemasında ifade
 * edilemez).
 */

export type AttendeeStatusValue = "REGISTERED" | "ATTENDED" | "CANCELLED";

export type AttendeeRegistrationInput = {
  eventId: string;
  memberId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
  notes?: string | null;
  status?: AttendeeStatusValue;
};

export type RegistrationFailure = "notFound" | "full" | "alreadyRegistered";
export type RegistrationResult = { ok: true; id: string } | { ok: false; reason: RegistrationFailure };

type Tx = Prisma.TransactionClient;

async function lockEvent(tx: Tx, eventId: string): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`events:attendees:${eventId}`}))::text AS locked`;
}

async function activeAttendees(tx: Tx, eventId: string, excludeId?: string) {
  return tx.eventAttendee.findMany({
    where: { eventId, status: { not: "CANCELLED" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { memberId: true },
  });
}

/** Yeni katılımcı. `publishedOnly`: portal yalnız yayımlanmış etkinliklere kayıt alır. */
export async function registerAttendee(
  input: AttendeeRegistrationInput,
  options: { publishedOnly?: boolean } = {},
): Promise<RegistrationResult> {
  const status = input.status ?? "REGISTERED";
  return getDb().$transaction(async (tx) => {
    await lockEvent(tx, input.eventId);
    const event = await tx.event.findFirst({
      where: { id: input.eventId, deletedAt: null, ...(options.publishedOnly ? { status: "PUBLISHED" } : {}) },
      select: { capacity: true },
    });
    if (!event) return { ok: false, reason: "notFound" } as const;

    const active = await activeAttendees(tx, input.eventId);
    if (input.memberId && active.some((attendee) => attendee.memberId === input.memberId)) {
      return { ok: false, reason: "alreadyRegistered" } as const;
    }
    if (status !== "CANCELLED" && event.capacity !== null && active.length >= event.capacity) {
      return { ok: false, reason: "full" } as const;
    }

    const created = await tx.eventAttendee.create({
      data: {
        eventId: input.eventId,
        memberId: input.memberId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        status,
      },
      select: { id: true },
    });
    return { ok: true, id: created.id } as const;
  });
}

/**
 * Katılım durumunu değiştirir. İptal edilmiş kayıt yeniden etkinleşirken kontenjan ve aynı üyenin başka bir
 * etkin kaydı aynı kilit altında denetlenir.
 */
export async function changeAttendeeStatus(
  attendeeId: string,
  status: AttendeeStatusValue,
): Promise<{ ok: true; eventId: string; previous: AttendeeStatusValue } | { ok: false; reason: RegistrationFailure }> {
  const db = getDb();
  const current = await db.eventAttendee.findUnique({ where: { id: attendeeId }, select: { eventId: true } });
  if (!current) return { ok: false, reason: "notFound" };

  return db.$transaction(async (tx) => {
    await lockEvent(tx, current.eventId);
    const attendee = await tx.eventAttendee.findUnique({
      where: { id: attendeeId },
      select: { eventId: true, memberId: true, status: true, event: { select: { capacity: true, deletedAt: true } } },
    });
    if (!attendee || attendee.event.deletedAt) return { ok: false, reason: "notFound" } as const;

    const reactivating = attendee.status === "CANCELLED" && status !== "CANCELLED";
    if (reactivating) {
      const active = await activeAttendees(tx, attendee.eventId, attendeeId);
      if (attendee.memberId && active.some((other) => other.memberId === attendee.memberId)) {
        return { ok: false, reason: "alreadyRegistered" } as const;
      }
      if (attendee.event.capacity !== null && active.length >= attendee.event.capacity) {
        return { ok: false, reason: "full" } as const;
      }
    }

    await tx.eventAttendee.update({ where: { id: attendeeId }, data: { status } });
    return { ok: true, eventId: attendee.eventId, previous: attendee.status as AttendeeStatusValue } as const;
  });
}
