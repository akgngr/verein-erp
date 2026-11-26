import { z } from "zod";

import { passwordSchema } from "@/shared/security/password";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "auth.validation.currentPasswordRequired"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "auth.validation.confirmPasswordRequired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "auth.validation.passwordsMismatch",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "auth.errors.samePassword",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
