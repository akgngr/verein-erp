import { z } from "zod";

import { passwordSchema } from "@/shared/security/password";

const roleSchema = z.enum(["ADMIN", "BOARD", "SECRETARY", "VIEWER"]);

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Ad soyad zorunludur.").max(100, "Ad soyad en fazla 100 karakter olabilir."),
  email: z.email("Geçerli bir e-posta adresi girin.").max(200),
  role: roleSchema,
  password: passwordSchema,
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "Ad soyad zorunludur.").max(100, "Ad soyad en fazla 100 karakter olabilir."),
  email: z.email("Geçerli bir e-posta adresi girin.").max(200),
  role: roleSchema,
  isActive: z.boolean(),
});

export const userResetPasswordSchema = z.object({
  id: z.string().min(1),
  password: passwordSchema,
});

export const userSetActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserResetPasswordInput = z.infer<typeof userResetPasswordSchema>;
export type UserSetActiveInput = z.infer<typeof userSetActiveSchema>;
