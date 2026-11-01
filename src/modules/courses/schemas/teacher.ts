import { z } from "zod";

const text = (max: number) => z.string().trim().max(max, "courses.validation.textMax");

export const teacherSchema = z
  .object({
    // Ad isteğe bağlı: tek kelimelik kullanıcı adları soyad olarak senkronlanır (services/teacher-sync.ts).
    firstName: text(80),
    lastName: z.string().trim().min(1, "courses.validation.lastNameRequired").max(80, "courses.validation.textMax"),
    email: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, "validation.emailInvalid"),
    phone: text(40),
    subjects: text(200),
    note: text(1000),
    isActive: z.boolean(),
    /** Ücret: ödeme bilgileri (IBAN vb.) öğretmenin kullanıcı profilinden okunur. */
    compensation: z.enum(["NONE", "HONORAR", "UEBUNGSLEITER", "EHRENAMT"]),
    /** Euro olarak (ör. "25,50"); boş = ücret yok. */
    rate: z.string().trim().refine((value) => value === "" || /^\d{1,5}([.,]\d{1,2})?$/.test(value), "courses.validation.rateInvalid"),
    rateUnit: z.enum(["HOUR", "SESSION"]),
    /** Yalnızca yeni kayıtta: TEACHER rolüyle giriş hesabı aç ve davet et. */
    invite: z.boolean(),
  })
  .refine((value) => !value.invite || value.email !== "", { path: ["email"], message: "courses.validation.emailForInvite" })
  .refine((value) => value.compensation === "NONE" || value.rate !== "", { path: ["rate"], message: "courses.validation.rateRequired" });

/** "25,50" → 2550 cent; boş → null. */
export function rateToCents(rate: string): number | null {
  return rate ? Math.round(Number(rate.replace(",", ".")) * 100) : null;
}

export const teacherUpdateSchema = teacherSchema.and(z.object({ id: z.string().min(1) }));
export const teacherInviteSchema = z.object({ id: z.string().min(1) });

export type TeacherInput = z.infer<typeof teacherSchema>;
