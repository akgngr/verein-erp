"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/shared/db";
import { requirePermission } from "@/modules/auth/server";
import { eventsPermissions } from "../permissions";
import {
  eventCreateSchema,
  eventUpdateSchema,
  attendeeAddSchema,
  attendeeStatusUpdateSchema,
  type EventCreateInput,
  type EventUpdateInput,
  type AttendeeAddInput,
  type AttendeeStatusUpdateInput,
} from "../schemas/event-schema";
import type { ActionResult } from "../types";

export async function createEventAction(rawInput: EventCreateInput): Promise<ActionResult<{ id: string }>> {
  await requirePermission(eventsPermissions, "create");

  const parsed = eventCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Girdi doğrulama hatası.",
    };
  }

  const data = parsed.data;

  try {
    const db = getDb();
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
    });

    revalidatePath("/events");
    return { success: true, data: { id: newEvent.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Etkinlik oluşturulurken bir hata oluştu.",
    };
  }
}

export async function updateEventAction(rawInput: EventUpdateInput): Promise<ActionResult> {
  await requirePermission(eventsPermissions, "update");

  const parsed = eventUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Girdi doğrulama hatası.",
    };
  }

  const { id, ...data } = parsed.data;

  try {
    const db = getDb();
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.isOnline !== undefined) updateData.isOnline = data.isOnline;
    if (data.onlineUrl !== undefined) updateData.onlineUrl = data.onlineUrl;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;

    await db.event.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Etkinlik güncellenirken bir hata oluştu.",
    };
  }
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  await requirePermission(eventsPermissions, "delete");

  if (!id) {
    return { success: false, error: "Geçersiz kimlik." };
  }

  try {
    const db = getDb();
    await db.event.delete({ where: { id } });
    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Etkinlik silinirken bir hata meydana geldi.",
    };
  }
}

export async function addAttendeeAction(rawInput: AttendeeAddInput): Promise<ActionResult<{ id: string }>> {
  await requirePermission(eventsPermissions, "update");

  const parsed = attendeeAddSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Girdi doğrulama hatası.",
    };
  }

  const data = parsed.data;

  try {
    const db = getDb();
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
    });

    if (!event) {
      return { success: false, error: "Etkinlik bulunamadı." };
    }

    if (event.capacity && event._count.attendees >= event.capacity) {
      return { success: false, error: "Etkinlik kontenjanı tamamen dolmuştur." };
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
    });

    revalidatePath("/events");
    return { success: true, data: { id: newAttendee.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Katılımcı kaydedilemedi.",
    };
  }
}

export async function updateAttendeeStatusAction(rawInput: AttendeeStatusUpdateInput): Promise<ActionResult> {
  await requirePermission(eventsPermissions, "update");

  const parsed = attendeeStatusUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Geçersiz durum verisi." };
  }

  try {
    const db = getDb();
    await db.eventAttendee.update({
      where: { id: parsed.data.attendeeId },
      data: { status: parsed.data.status },
    });

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Katılım durumu güncellenemedi.",
    };
  }
}

export async function deleteAttendeeAction(attendeeId: string): Promise<ActionResult> {
  await requirePermission(eventsPermissions, "update");

  if (!attendeeId) {
    return { success: false, error: "Geçersiz katılımcı kimliği." };
  }

  try {
    const db = getDb();
    await db.eventAttendee.delete({
      where: { id: attendeeId },
    });

    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Katılımcı silinemedi.",
    };
  }
}
