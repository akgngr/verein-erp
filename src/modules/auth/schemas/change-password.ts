import { z } from "zod";

import { passwordSchema } from "@/shared/security/password";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut parolanızı girin."),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
