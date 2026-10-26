"use server";

import { getDb } from "@/shared/db";
import { hashPassword, verifyPassword } from "@/shared/security/password";

import { unstable_update } from "../auth";
import { ActionError } from "../errors";
import { changePasswordSchema } from "../schemas/change-password";
import { createAction } from "../server";

/**
 * /profil: kullanıcı mevcut parolası + yeni parola ile kendi parolasını değiştirir.
 * Başarılı olunca mustChangePassword = false yapılır, PASSWORD_CHANGE denetim
 * kaydı yazılır ve JWT içindeki bilgi unstable_update ile tazelenir.
 */
export async function changePasswordAction(input: unknown) {
  const run = createAction({
    schema: changePasswordSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      if (!dbUser || !dbUser.isActive) {
        throw new ActionError("Oturumunuz geçersiz. Lütfen tekrar giriş yapın.");
      }

      const currentOk = await verifyPassword(input.currentPassword, dbUser.passwordHash);
      if (!currentOk) {
        throw new ActionError("Mevcut parolanız hatalı.", {
          currentPassword: ["Mevcut parolanız hatalı."],
        });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });

      // changes alanına parola değerleri ASLA yazılmaz (write-audit temizler).
      await audit({ action: "PASSWORD_CHANGE", entity: "User", entityId: user.id });

      // JWT/middleware içindeki mustChangePassword bilgisini tazele.
      await unstable_update({
        user: { name: user.name, email: user.email, mustChangePassword: false },
      });

      return undefined;
    },
  });

  return run(input);
}
