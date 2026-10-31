import { z } from "zod";

import { passwordSchema } from "@/shared/security/password";

/** Rol anahtarı; var olup atanabilir olduğu sunucuda ayrıca denetlenir (isAssignableRole). */
const roleSchema = z.string().trim().min(1, "users.validation.roleRequired").max(40);

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "users.validation.nameRequired").max(100, "users.validation.nameMax"),
  email: z.email("validation.emailInvalid").max(200),
  role: roleSchema,
  password: passwordSchema,
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "users.validation.nameRequired").max(100, "users.validation.nameMax"),
  email: z.email("validation.emailInvalid").max(200),
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
