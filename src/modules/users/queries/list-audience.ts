import "server-only";

import { getDb } from "@/shared/db";
import type { Role } from "@/shared/roles";

/** Bildirim kitlesi: ETKİN kullanıcılar (isteğe bağlı role süzgeci). Yalnız kimlik ve rol; en fazla 5000. */
export async function listActiveUsersForAudience(roles?: readonly Role[]): Promise<{ id: string; role: Role }[]> {
  return getDb().user.findMany({
    where: { isActive: true, ...(roles?.length ? { role: { in: [...roles] } } : {}) },
    select: { id: true, role: true },
    orderBy: { createdAt: "asc" },
    take: 5000,
  }) as Promise<{ id: string; role: Role }[]>;
}
