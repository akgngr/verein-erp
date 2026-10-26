import type { Role } from "@prisma/client";

/** Oturumda taşınan kullanıcı bilgisi (JWT + session.user). */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
};
