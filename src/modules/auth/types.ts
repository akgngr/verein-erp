import type { Role } from "@/shared/roles";

/** Oturumda taşınan kullanıcı bilgisi (JWT + session.user). */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
};
