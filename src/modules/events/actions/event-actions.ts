"use server"

import { revalidatePath } from "next/cache"

import { ActionError, createAction } from "@/modules/auth/server"
import { getDb } from "@/shared/db"
import type { ActionResult } from "@/shared/types/action"

import { berlinLocalToUtc, utcToBerlinLocalInput } from "../helpers/berlin-time"
import { eventsPermissions } from "../permissions"
import {
  attendeeAddSchema,
  attendeeIdSchema,
  attendeeStatusUpdateSchema,
  eventCreateSchema,
  eventIdSchema,
  eventUpdateSchema,
  isEndBeforeStart,
} from "../schemas/event-schema"
import { changeAttendeeStatus, registerAttendee, type RegistrationFailure } from "../services/attendee-registration"

/**
 * #584: Tüm yazma işlemleri createAction ile çalışır: yetki, Zod doğrulaması ve denetim kaydı (A-*).
 * Denetim kaydına kişi adı yazılmaz; katılımcılar kimlik ve durumla izlenir.
 * Saatler Europe/Berlin duvar saati olarak gelir ve UTC'ye çevrilir (helpers/berlin-time.ts).
 */

const EVENTS_PATH = "/events"

const REGISTRATION_ERRORS: Record<RegistrationFailure, string> = {
  notFound: "events.errors.notFound",
  full: "events.errors.capacityFull",
  alreadyRegistered: "events.errors.alreadyRegistered",
}

/** Doğrulanmış Berlin duvar saatini UTC'ye çevirir (şema geçersiz değeri zaten reddetti). */
function toUtc(value: string): Date {
  const date = berlinLocalToUtc(value)
  if (!date) throw new ActionError("events.validation.dateInvalid", { startDate: ["events.validation.dateInvalid"] })
  return date
}

const emptyToNull = (value: string | null | undefined) => (value ? value : null)

export async function createEventAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: eventsPermissions, action: "create" },
    schema: eventCreateSchema,
    handler: async ({ input, user, audit }) => {
      const event = await getDb().event.create({
        data: {
          title: input.title,
          description: emptyToNull(input.description),
          type: input.type,
          status: input.status,
          startDate: toUtc(input.startDate),
          endDate: input.endDate ? toUtc(input.endDate) : null,
          location: emptyToNull(input.location),
          isOnline: input.isOnline,
          onlineUrl: emptyToNull(input.onlineUrl),
          capacity: input.capacity ?? null,
          createdById: user.id,
        },
        select: { id: true, title: true, type: true, status: true, startDate: true, endDate: true, capacity: true },
      })
      await audit({ action: "CREATE", entity: "Event", entityId: event.id, after: event })
      revalidatePath(EVENTS_PATH)
      return { id: event.id }
    },
  })
  return run(rawInput)
}

export async function updateEventAction(rawInput: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: eventsPermissions, action: "update" },
    schema: eventUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb()
      const { id, ...changes } = input
      const before = await db.event.findFirst({
        where: { id, deletedAt: null },
        select: { title: true, type: true, status: true, startDate: true, endDate: true, capacity: true, location: true, isOnline: true },
      })
      if (!before) throw new ActionError("events.errors.notFound")

      // Yalnız biri gönderildiyse bitiş kontrolü kayıttaki diğer değerle yapılır.
      const effectiveStart = changes.startDate ?? utcToBerlinLocalInput(before.startDate)
      const effectiveEnd = changes.endDate !== undefined ? changes.endDate : utcToBerlinLocalInput(before.endDate)
      if (isEndBeforeStart(effectiveStart, effectiveEnd)) {
        throw new ActionError("events.validation.endBeforeStart", { endDate: ["events.validation.endBeforeStart"] })
      }

      const data: Parameters<typeof db.event.update>[0]["data"] = {}
      if (changes.title !== undefined) data.title = changes.title
      if (changes.description !== undefined) data.description = emptyToNull(changes.description)
      if (changes.type !== undefined) data.type = changes.type
      if (changes.status !== undefined) data.status = changes.status
      if (changes.startDate !== undefined) data.startDate = toUtc(changes.startDate)
      if (changes.endDate !== undefined) data.endDate = changes.endDate ? toUtc(changes.endDate) : null
      if (changes.location !== undefined) data.location = emptyToNull(changes.location)
      if (changes.isOnline !== undefined) data.isOnline = changes.isOnline
      if (changes.onlineUrl !== undefined) data.onlineUrl = emptyToNull(changes.onlineUrl)
      if (changes.capacity !== undefined) data.capacity = changes.capacity ?? null

      const after = await db.event.update({
        where: { id },
        data,
        select: { title: true, type: true, status: true, startDate: true, endDate: true, capacity: true, location: true, isOnline: true },
      })
      await audit({ action: "UPDATE", entity: "Event", entityId: id, before, after })
      revalidatePath(EVENTS_PATH)
      return undefined
    },
  })
  return run(rawInput)
}

/** Yumuşak silme: etkinlik listelerden kalkar; kayıt ve katılımcılar denetim için korunur. */
export async function deleteEventAction(rawId: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: eventsPermissions, action: "delete" },
    schema: eventIdSchema,
    handler: async ({ input: id, user, audit }) => {
      const result = await getDb().event.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), deletedById: user.id },
      })
      if (result.count !== 1) throw new ActionError("events.errors.notFound")
      await audit({ action: "DELETE", entity: "Event", entityId: id })
      revalidatePath(EVENTS_PATH)
      return undefined
    },
  })
  return run(rawId)
}

/**
 * Üye seçildiyse kaydın var ve etkin/pasif olduğu members modülünün public API'si ile doğrulanır.
 * Ad alanları seçicide üye adıyla doldurulur; yönetici düzeltebilir.
 */
async function assertMemberExists(memberId: string): Promise<void> {
  const { listMemberOptions } = await import("@/modules/members/server")
  const [member] = await listMemberOptions({ ids: [memberId] })
  if (!member) throw new ActionError("events.errors.memberNotFound", { memberId: ["events.errors.memberNotFound"] })
}

export async function addAttendeeAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: eventsPermissions, action: "update" },
    schema: attendeeAddSchema,
    handler: async ({ input, audit }) => {
      const memberId = input.memberId || null
      if (memberId) await assertMemberExists(memberId)

      const result = await registerAttendee({
        eventId: input.eventId,
        memberId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email || null,
        phone: emptyToNull(input.phone),
        notes: emptyToNull(input.notes),
        status: input.status,
      })
      if (!result.ok) throw new ActionError(REGISTRATION_ERRORS[result.reason])

      await audit({
        action: "CREATE",
        entity: "EventAttendee",
        entityId: result.id,
        after: { eventId: input.eventId, memberId, status: input.status },
      })
      revalidatePath(EVENTS_PATH)
      return { id: result.id }
    },
  })
  return run(rawInput)
}

export async function updateAttendeeStatusAction(rawInput: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: eventsPermissions, action: "update" },
    schema: attendeeStatusUpdateSchema,
    handler: async ({ input, audit }) => {
      const result = await changeAttendeeStatus(input.attendeeId, input.status)
      if (!result.ok) throw new ActionError(REGISTRATION_ERRORS[result.reason])
      await audit({
        action: "STATUS_CHANGE",
        entity: "EventAttendee",
        entityId: input.attendeeId,
        before: { status: result.previous },
        after: { eventId: result.eventId, status: input.status },
      })
      revalidatePath(EVENTS_PATH)
      return undefined
    },
  })
  return run(rawInput)
}

export async function deleteAttendeeAction(rawInput: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: eventsPermissions, action: "update" },
    schema: attendeeIdSchema,
    handler: async ({ input, audit }) => {
      const db = getDb()
      const attendee = await db.eventAttendee.findUnique({
        where: { id: input.attendeeId },
        select: { eventId: true, memberId: true, status: true },
      })
      if (!attendee) throw new ActionError("events.errors.invalidAttendeeId")
      await db.eventAttendee.delete({ where: { id: input.attendeeId } })
      await audit({ action: "DELETE", entity: "EventAttendee", entityId: input.attendeeId, before: attendee })
      revalidatePath(EVENTS_PATH)
      return undefined
    },
  })
  return run(rawInput)
}
