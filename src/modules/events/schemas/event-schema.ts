import { z } from "zod"

export const eventCreateSchema = z.object({
  title: z.string().trim().min(3, "events.validation.titleMin"),
  description: z.string().trim().optional().nullable(),
  type: z
    .enum(["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"])
    .default("OTHER"),
  status: z
    .enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"])
    .default("PUBLISHED"),
  startDate: z.string().min(1, "events.validation.startRequired"),
  endDate: z.string().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  isOnline: z.boolean().default(false),
  onlineUrl: z
    .string()
    .trim()
    .url("events.validation.urlInvalid")
    .optional()
    .or(z.literal(""))
    .nullable(),
  capacity: z.coerce
    .number()
    .int()
    .positive("events.validation.capacityPositive")
    .optional()
    .nullable(),
})

export const eventUpdateSchema = eventCreateSchema.partial().extend({
  id: z.string().uuid("events.validation.eventIdInvalid"),
})

export const attendeeAddSchema = z.object({
  eventId: z.string().uuid("events.validation.eventIdInvalid"),
  memberId: z.string().optional().nullable(),
  firstName: z.string().trim().min(2, "events.validation.firstNameMin"),
  lastName: z.string().trim().min(2, "events.validation.lastNameMin"),
  email: z
    .string()
    .trim()
    .email("events.validation.emailInvalid")
    .optional()
    .or(z.literal(""))
    .nullable(),
  phone: z.string().trim().optional().nullable(),
  status: z.enum(["REGISTERED", "ATTENDED", "CANCELLED"]).default("REGISTERED"),
  notes: z.string().trim().optional().nullable(),
})

export const attendeeStatusUpdateSchema = z.object({
  attendeeId: z.string().uuid("events.errors.invalidAttendeeId"),
  status: z.enum(["REGISTERED", "ATTENDED", "CANCELLED"]),
})

export type EventCreateInput = z.infer<typeof eventCreateSchema>
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>
export type AttendeeAddInput = z.infer<typeof attendeeAddSchema>
export type AttendeeStatusUpdateInput = z.infer<
  typeof attendeeStatusUpdateSchema
>
