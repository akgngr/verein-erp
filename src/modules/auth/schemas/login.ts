import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "auth.validation.emailRequired")
    .pipe(z.email("validation.emailInvalid")),
  password: z.string().min(1, "auth.validation.passwordRequired"),
  /** #603: second step — 6-digit app code or a recovery code; only sent once the server asks for it. */
  otp: z.string().trim().max(32).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
