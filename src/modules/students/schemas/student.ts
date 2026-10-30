import { z } from "zod";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const optionalText = (max: number, key: string) => z.string().trim().max(max, key);
const optionalDate = z.string().trim().refine((value) => value === "" || DATE_ONLY.test(value), "students.validation.dateInvalid");

/** Öğrenci formu: form ve action aynı şemayı kullanır (boş metin = yok). */
export const studentSchema = z.object({
  firstName: z.string().trim().min(1, "students.validation.firstNameRequired").max(80, "students.validation.nameMax"),
  lastName: z.string().trim().min(1, "students.validation.lastNameRequired").max(80, "students.validation.nameMax"),
  birthDate: optionalDate,
  school: optionalText(120, "students.validation.textMax"),
  gradeLevel: optionalText(20, "students.validation.textMax"),
  email: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, "validation.emailInvalid"),
  phone: optionalText(40, "students.validation.textMax"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  photoConsent: z.boolean(),
  dataConsentAt: optionalDate,
  note: optionalText(2000, "students.validation.noteMax"),
});

export const studentUpdateSchema = studentSchema.extend({ id: z.string().min(1) });
export const studentDeleteSchema = z.object({ id: z.string().min(1) });

export const guardianLinkSchema = z.object({
  studentId: z.string().min(1),
  guardianId: z.string().min(1, "students.validation.guardianRequired"),
  relation: z.enum(["MOTHER", "FATHER", "GUARDIAN", "SELF", "OTHER"]),
  isPayer: z.boolean(),
});
export const guardianUnlinkSchema = z.object({ studentId: z.string().min(1), guardianId: z.string().min(1) });
export const selfPayerSchema = z.object({ studentId: z.string().min(1) });

export type StudentInput = z.infer<typeof studentSchema>;
export type GuardianLinkInput = z.infer<typeof guardianLinkSchema>;
