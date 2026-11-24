import { z } from "zod";

import { passwordSchema } from "@/shared/security/password";

/** Rol anahtarı; var olup atanabilir olduğu sunucuda ayrıca denetlenir (isAssignableRole). */
const roleSchema = z.string().trim().min(1, "users.validation.roleRequired").max(40);

/**
 * Hesap kurulumu: "invite" = kullanıcı e-postadaki tek kullanımlık bağlantıyla şifresini kendisi belirler
 * (varsayılan, güvenli); "password" = yönetici geçici şifre belirler ve kişiye kendisi iletir.
 */
export const USER_SETUP_MODES = ["invite", "password"] as const;

export const userCreateSchema = z
  .object({
    name: z.string().trim().min(1, "users.validation.nameRequired").max(100, "users.validation.nameMax"),
    email: z.email("validation.emailInvalid").max(200),
    role: roleSchema,
    setupMode: z.enum(USER_SETUP_MODES),
    password: z.string().max(200).optional(),
    grantModuleScope: z.enum(["accounting", "finance"]).nullable().optional(),
    grantStartsAt: z.string().datetime().optional(),
    grantExpiresAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.setupMode !== "password") return;
    const parsed = passwordSchema.safeParse(value.password ?? "");
    if (!parsed.success) for (const issue of parsed.error.issues) ctx.addIssue({ code: "custom", path: ["password"], message: issue.message });
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
