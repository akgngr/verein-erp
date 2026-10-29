import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "auth.validation.emailRequired")
    .pipe(z.email("validation.emailInvalid")),
  password: z.string().min(1, "auth.validation.passwordRequired"),
});

export type LoginInput = z.infer<typeof loginSchema>;
