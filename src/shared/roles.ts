import type { Role } from "@prisma/client";

// Yalnızca TİP aktarımı yapılır (çalışma zamanı bağımlılığı yoktur).
export type { Role };

/** HeroUI Chip bileşeninin "color" prop değerleri. */
export type ChipColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";

/**
 * Yeni bir rol Prisma enum'una eklendiğinde derleme hatası alınır (Record<Role, ...> zorunlu
 * kılar); rengi buraya, etiketi messages/shell/<dil>.json → "roles" altına eklenir.
 */
export const ROLE_COLORS: Record<Role, ChipColor> = {
  ADMIN: "primary",
  BOARD: "secondary",
  SECRETARY: "success",
  VIEWER: "default",
  TREASURER: "warning",
  AUDITOR: "danger",
  TEACHER: "secondary",
};

/** Tüm roller (sabit sırayla). Etiket: useTranslations("roles")(role). */
export const ROLES = Object.keys(ROLE_COLORS) as Role[];
