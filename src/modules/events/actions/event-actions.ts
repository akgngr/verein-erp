"use server"

import { revalidatePath } from "next/cache"
import { getDb } from "@/shared/db"
import { requirePermission } from "@/modules/auth/server";
import { getMessageTranslator } from "@/shared/i18n/translate-message";
import { eventsPermissions } from "../permissions"
import {
  eventCreateSchema,
  eventUpdateSchema,
  attendeeAddSchema,
  attendeeStatusUpdateSchema,
  type EventCreateInput,
  type EventUpdateInput,
  type AttendeeAddInput,
  type AttendeeStatusUpdateInput,
} from "../schemas/event-schema"
import type { ActionResult } from "../types"

/** Beklenmeyen hata: ayrıntı loglanır, kullanıcıya çevrilmiş genel mesaj döner (ham DB mesajı sızmaz). */
function failure(error: unknown, message: string): string {
  console.error("[events]", error)
  return message
}

export async function createEventAction(
  rawInput: EventCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const translate = await getMessageTranslator()
  await requirePermission(eventsPermissions, "create")

  const parsed = eventCreateSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: translate(parsed.error.issues[0]?.message ?? "events.errors.invalidInput"),
    }
  }

  const data = parsed.data
  const db = getDb()

  try {
    const newEvent = await db.event.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        type: data.type,
        status: data.status,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        location: data.location ?? null,
        isOnline: Boolean(data.isOnline),
        onlineUrl: data.onlineUrl ?? null,
        capacity: data.capacity !== undefined ? data.capacity : null,
      },
      select: { id: true },
    })

    revalidatePath("/events")
    return { success: true, data: { id: newEvent.id } }
  } catch (error) {
    return {
      success: false,
      error: failure(error, translate("events.errors.createFailed")),
    }
  }
}

export async function updateEventAction(
  rawInput: EventUpdateInput,
): Promise<ActionResult> {
  const translate = await getMessageTranslator()
  await requirePermission(eventsPermissions, "update")

  const parsed = eventUpdateSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: translate(parsed.error.issues[0]?.message ?? "events.errors.invalidInput"),
    }
  }

  const { id, ...data } = parsed.data
  if (!id) {
    return { success: false, error: translate("events.errors.idMissing") }
  }

  const db = getDb()

  try {
    const updateData: {
      title?: string
      description?: string | null
      type?: string
      status?: string
      startDate?: Date
      endDate?: Date | null
      location?: string | null
      isOnline?: boolean
      onlineUrl?: string | null
      capacity?: number | null
    } = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined)
      updateData.description = data.description
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (data.startDate !== undefined)
      updateData.startDate = new Date(data.startDate)
    if (data.endDate !== undefined)
      updateData.endDate = data.endDate ? new Date(data.endDate) : null
    if (data.location !== undefined) updateData.location = data.location
    if (data.isOnline !== undefined) updateData.isOnline = data.isOnline
    if (data.onlineUrl !== undefined) updateData.onlineUrl = data.onlineUrl
    if (data.capacity !== undefined) updateData.capacity = data.capacity

    await db.event.update({
      where: { id },
      data: updateData,
    })

    revalidatePath("/events")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: failure(error, translate("events.errors.updateFailed")),
    }
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  const translate = await getMessageTranslator()
  await requirePermission(eventsPermissions, "delete")

  if (!id) {
    return { success: false, error: translate("events.errors.invalidId") }
  }

  const db = getDb()

  try {
    await db.event.delete({ where: { id } })
    revalidatePath("/events")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: failure(error, translate("events.errors.deleteFailed")),
    }
  }
}

export async function addAttendeeAction(
  rawInput: AttendeeAddInput,
): Promise<ActionResult<{ id: string }>> {
  const translate = await getMessageTranslator()
  await requirePermission(eventsPermissions, "update")

  const parsed = attendeeAddSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: translate(parsed.error.issues[0]?.message ?? "events.errors.invalidInput"),
    }
  }

  const data = parsed.data
  const db = getDb()

  try {
    const event = await db.event.findUnique({
      where: { id: data.eventId },
      select: {
        capacity: true,
        _count: {
          select: {
            attendees: { where: { status: { not: "CANCELLED" } } },
          },
        },
      },
    })

    if (!event) {
      return { success: false, error: translate("events.errors.notFound") }
    }

    if (event.capacity && event._count.attendees >= event.capacity) {
      return { success: false, error: translate("events.errors.capacityFull") }
    }

    const newAttendee = await db.eventAttendee.create({
      data: {
        eventId: data.eventId,
        memberId: data.memberId ?? null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
        status: data.status,
        notes: data.notes ?? null,
      },
      select: { id: true },
    })

    revalidatePath("/events")
    return { success: true, data: { id: newAttendee.id } }
  } catch (error) {
    return {
      success: false,
      error: failure(error, translate("events.errors.attendeeAddFailed")),
    }
  }
}

export async function updateAttendeeStatusAction(
  rawInput: AttendeeStatusUpdateInput,
): Promise<ActionResult> {
  const translate = await getMessageTranslator()
  await requirePermission(eventsPermissions, "update")

  const parsed = attendeeStatusUpdateSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: translate("events.errors.invalidStatus") }
  }

  const db = getDb()

  try {
    await db.eventAttendee.update({
      where: { id: parsed.data.attendeeId },
      data: { status: parsed.data.status },
    })

    revalidatePath("/events")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: failure(error, translate("events.errors.statusUpdateFailed")),
    }
  }
}

export async function deleteAttendeeAction(
  attendeeId: string,
): Promise<ActionResult> {
  const translate = await getMessageTranslator()
  await requirePermission(eventsPermissions, "update")

  if (!attendeeId) {
    return { success: false, error: translate("events.errors.invalidAttendeeId") }
  }

  const db = getDb()

  try {
    await db.eventAttendee.delete({
      where: { id: attendeeId },
    })

    revalidatePath("/events")
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: failure(error, translate("events.errors.attendeeDeleteFailed")),
    }
  }
}
