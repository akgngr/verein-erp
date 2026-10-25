import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-posta zorunludur.")
    .pipe(z.email("Geçerli bir e-posta adresi girin.")),
  password: z.string().min(1, "Parola zorunludur."),
});

export type LoginInput = z.infer<typeof loginSchema>;
