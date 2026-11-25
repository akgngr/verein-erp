import { z } from "zod"

import { berlinLocalToUtc } from "../helpers/berlin-time"

export const EVENT_TYPE_VALUES = ["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"] as const
export const EVENT_STATUS_VALUES = ["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"] as const
export const ATTENDEE_STATUS_VALUES = ["REGISTERED", "ATTENDED", "CANCELLED"] as const

/** Berlin duvar saati ("YYYY-MM-DDTHH:mm"); takvimde olmayan tarih reddedilir (#584). */
const berlinDateTime = z
  .string()
  .trim()
  .min(1, "events.validation.startRequired")
  .refine((value) => berlinLocalToUtc(value) !== null, "events.validation.dateInvalid")

const optionalBerlinDateTime = z
  .union([
    z.literal(""),
    z.string().trim().refine((value) => berlinLocalToUtc(value) !== null, "events.validation.dateInvalid"),
  ])
  .optional()
  .nullable()

/**
 * Alanlar VARSAYILAN DEĞER TAŞIMAZ (#584): `.partial()` güncellemesinde `.default()` gönderilmeyen alanı
 * (tür, durum, çevrim içi) varsayılanla ezerdi. Varsayılanlar yalnız oluşturma şemasında eklenir.
 */
const eventFields = {
  title: z.string().trim().min(3, "events.validation.titleMin").max(200, "events.validation.titleMax"),
  description: z.string().trim().max(5000, "events.validation.descriptionMax").optional().nullable(),
  type: z.enum(EVENT_TYPE_VALUES),
  status: z.enum(EVENT_STATUS_VALUES),
  startDate: berlinDateTime,
  endDate: optionalBerlinDateTime,
  location: z.string().trim().max(300, "events.validation.locationMax").optional().nullable(),
  isOnline: z.boolean(),
  onlineUrl: z
    .string()
    .trim()
    .max(500, "events.validation.urlInvalid")
    .url("events.validation.urlInvalid")
    .optional()
    .or(z.literal(""))
    .nullable(),
  capacity: z.coerce
    .number()
    .int()
    .positive("events.validation.capacityPositive")
    .max(100_000, "events.validation.capacityMax")
    .optional()
    .nullable(),
}

/** Bitiş başlangıçtan önce mi? Eksik veya geçersiz değerde `false` (ayrı kurallar yakalar). */
export function isEndBeforeStart(startDate?: string | null, endDate?: string | null): boolean {
  if (!startDate || !endDate) return false
  const start = berlinLocalToUtc(startDate)
  const end = berlinLocalToUtc(endDate)
  return Boolean(start && end && end.getTime() < start.getTime())
}

const endAfterStart = (value: { startDate?: string | null; endDate?: string | null }, ctx: z.RefinementCtx) => {
  if (isEndBeforeStart(value.startDate, value.endDate)) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "events.validation.endBeforeStart" })
  }
}

export const eventCreateSchema = z
  .object({
    ...eventFields,
    type: eventFields.type.default("OTHER"),
    status: eventFields.status.default("PUBLISHED"),
    isOnline: eventFields.isOnline.default(false),
  })
  .superRefine(endAfterStart)

/** Güncelleme: yalnız gönderilen alanlar değişir; bitiş kontrolü veritabanındaki değerle de yapılır (eylemde). */
export const eventUpdateSchema = z
  .object(eventFields)
  .partial()
  .extend({ id: z.string().uuid("events.validation.eventIdInvalid") })
  .superRefine(endAfterStart)

export const eventIdSchema = z.string().uuid("events.errors.invalidId")

export const attendeeAddSchema = z.object({
  eventId: z.string().uuid("events.validation.eventIdInvalid"),
  memberId: z.string().trim().max(64, "events.errors.invalidId").optional().nullable(),
  firstName: z.string().trim().min(2, "events.validation.firstNameMin").max(100, "events.validation.nameMax"),
  lastName: z.string().trim().min(2, "events.validation.lastNameMin").max(100, "events.validation.nameMax"),
  email: z
    .string()
    .trim()
    .max(254, "events.validation.emailInvalid")
    .email("events.validation.emailInvalid")
    .optional()
    .or(z.literal(""))
    .nullable(),
  phone: z.string().trim().max(40, "events.validation.phoneMax").optional().nullable(),
  status: z.enum(ATTENDEE_STATUS_VALUES).default("REGISTERED"),
  notes: z.string().trim().max(1000, "events.validation.notesMax").optional().nullable(),
})

export const attendeeStatusUpdateSchema = z.object({
  attendeeId: z.string().uuid("events.errors.invalidAttendeeId"),
  status: z.enum(ATTENDEE_STATUS_VALUES),
})

export const attendeeIdSchema = z.object({ attendeeId: z.string().uuid("events.errors.invalidAttendeeId") })

export type EventCreateInput = z.input<typeof eventCreateSchema>
export type EventUpdateInput = z.input<typeof eventUpdateSchema>
export type AttendeeAddInput = z.input<typeof attendeeAddSchema>
export type AttendeeStatusUpdateInput = z.input<typeof attendeeStatusUpdateSchema>
