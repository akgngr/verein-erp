import { z } from "zod"

export const eventCreateSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalıdır."),
  description: z.string().trim().optional().nullable(),
  type: z
    .enum(["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"])
    .default("OTHER"),
  status: z
    .enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"])
    .default("PUBLISHED"),
  startDate: z.string().min(1, "Başlangıç zamanı zorunludur."),
  endDate: z.string().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  isOnline: z.boolean().default(false),
  onlineUrl: z
    .string()
    .trim()
    .url("Geçerli bir web adresi giriniz.")
    .optional()
    .or(z.literal(""))
    .nullable(),
  capacity: z.coerce
    .number()
    .int()
    .positive("Kontenjan pozitif bir sayı olmalıdır.")
    .optional()
    .nullable(),
})

export const eventUpdateSchema = eventCreateSchema.partial().extend({
  id: z.string().uuid("Geçersiz etkinlik kimliği."),
})

export const attendeeAddSchema = z.object({
  eventId: z.string().uuid("Geçersiz etkinlik kimliği."),
  memberId: z.string().optional().nullable(),
  firstName: z.string().trim().min(2, "Ad en az 2 karakter olmalıdır."),
  lastName: z.string().trim().min(2, "Soyad en az 2 karakter olmalıdır."),
  email: z
    .string()
    .trim()
    .email("Geçerli bir e-posta giriniz.")
    .optional()
    .or(z.literal(""))
    .nullable(),
  phone: z.string().trim().optional().nullable(),
  status: z.enum(["REGISTERED", "ATTENDED", "CANCELLED"]).default("REGISTERED"),
  notes: z.string().trim().optional().nullable(),
})

export const attendeeStatusUpdateSchema = z.object({
  attendeeId: z.string().uuid("Geçersiz katılımcı kimliği."),
  status: z.enum(["REGISTERED", "ATTENDED", "CANCELLED"]),
})

export type EventCreateInput = z.infer<typeof eventCreateSchema>
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>
export type AttendeeAddInput = z.infer<typeof attendeeAddSchema>
export type AttendeeStatusUpdateInput = z.infer<
  typeof attendeeStatusUpdateSchema
>
