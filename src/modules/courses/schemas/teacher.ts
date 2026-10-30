import { z } from "zod";

const text = (max: number) => z.string().trim().max(max, "courses.validation.textMax");

export const teacherSchema = z
  .object({
    firstName: z.string().trim().min(1, "courses.validation.firstNameRequired").max(80, "courses.validation.textMax"),
    lastName: z.string().trim().min(1, "courses.validation.lastNameRequired").max(80, "courses.validation.textMax"),
    email: z.string().trim().refine((value) => value === "" || z.email().safeParse(value).success, "validation.emailInvalid"),
    phone: text(40),
    subjects: text(200),
    note: text(1000),
    isActive: z.boolean(),
    /** Yalnızca yeni kayıtta: TEACHER rolüyle giriş hesabı aç ve davet et. */
    invite: z.boolean(),
  })
  .refine((value) => !value.invite || value.email !== "", { path: ["email"], message: "courses.validation.emailForInvite" });

export const teacherUpdateSchema = teacherSchema.and(z.object({ id: z.string().min(1) }));
export const teacherInviteSchema = z.object({ id: z.string().min(1) });

export type TeacherInput = z.infer<typeof teacherSchema>;
