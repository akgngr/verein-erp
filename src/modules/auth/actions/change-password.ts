"use server";

import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { hashPassword, verifyPassword } from "@/shared/security/password";

import { signIn } from "../auth";
import { ActionError } from "../errors";
import { createReissueTicket } from "../services/totp";
import { changePasswordSchema } from "../schemas/change-password";
import { createAction } from "../server";

/**
 * /profil: kullanıcı mevcut parolası + yeni parola ile kendi parolasını değiştirir.
 * Başarılı olunca mustChangePassword = false yapılır, PASSWORD_CHANGE denetim
 * kaydı yazılır ve yeni parola özetiyle taze bir JWT çerezi üretilir (diğer
 * cihazlardaki eski oturumlar sessionVersion uyuşmazlığıyla anında düşer).
 */
export async function changePasswordAction(input: unknown) {
  const run = createAction({
    allowPasswordChangePending: true,
    schema: changePasswordSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      if (!dbUser || !dbUser.isActive) {
        throw new ActionError("auth.errors.sessionInvalid");
      }

      const currentOk = await verifyPassword(input.currentPassword, dbUser.passwordHash);
      if (!currentOk) {
        throw new ActionError("auth.errors.currentPasswordWrong", {
          currentPassword: ["auth.errors.currentPasswordWrong"],
        });
      }

      if (input.newPassword === input.currentPassword) {
        throw new ActionError("auth.errors.samePassword", {
          newPassword: ["auth.errors.samePassword"],
        });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      // #603: Bekleyen şifre bağlantıları (sıfırlama/davet) yeni şifreyle geçersiz olur; eski bir bağlantı onu ezemez.
      const { revokePendingPasswordLinks } = await import("@/modules/users/server");
      await revokePendingPasswordLinks(user.id);

      // changes alanına parola değerleri ASLA yazılmaz (write-audit temizler).
      await audit({ action: "PASSWORD_CHANGE", entity: "User", entityId: user.id });

      // Taze JWT çerezi üret: mustChangePassword = false ve yeni sessionVersion
      // tarayıcıya kesin Set-Cookie olarak yazılır (unstable_update'in Next 16'da
      // çerezi yenileyememesi nedeniyle /profil kilidi böylece tamamen kalkar).
      await signIn("credentials", {
        email: dbUser.email,
        password: input.newPassword,
        // #603: this session already passed the second factor; the ticket stands in for it (server-only).
        reissue: createReissueTicket(dbUser.id, getEnv().AUTH_SECRET),
        redirect: false,
      });

      return undefined;
    },
  });

  return run(input);
}
