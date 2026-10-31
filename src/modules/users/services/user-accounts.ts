import { isAssignableRole } from "./roles";
import "server-only";

import type { Role } from "@/shared/roles";

import { getDb } from "@/shared/db";
import { hashPassword } from "@/shared/security/password";

import { ActionError } from "@/modules/auth/server";

/**
 * Başka modüllerin kullanıcı hesabı açması için (örn. kurslar: öğretmen daveti).
 * İzin denetimini ÇAĞIRAN yapar. Hesap geçici parolayla açılır; ilk girişte parola değişimi zorunludur.
 */
export async function createUserAccount(input: { name: string; email: string; role: Role; temporaryPassword: string }): Promise<{ id: string }> {
  const db = getDb();
  const email = input.email.toLowerCase();
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new ActionError("users.errors.emailTaken");
  }
  if (!(await isAssignableRole(input.role))) throw new ActionError("users.errors.roleUnavailable");
  const created = await db.user.create({
    data: {
      name: input.name,
      email,
      role: input.role,
      passwordHash: await hashPassword(input.temporaryPassword),
      mustChangePassword: true,
    },
    select: { id: true },
  });
  return created;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await getDb().user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
  return user?.id ?? null;
}
