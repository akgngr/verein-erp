import type { Role } from "@/shared/roles";

import type { SessionUser } from "../types";

/** Oturum süresi: 8 saat. */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/**
 * JWT token alanları ile SessionUser alanları arasındaki tek nokta eşleme.
 * auth.config.ts içindeki jwt/session callback'leri kullanır.
 */
export function tokenToSessionUser(token: {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: Role;
  mustChangePassword?: boolean;
}): SessionUser | null {
  if (!token.id || !token.role) return null;
  return {
    id: token.id,
    name: token.name ?? "",
    email: token.email ?? "",
    role: token.role,
    mustChangePassword: token.mustChangePassword ?? true,
  };
}
