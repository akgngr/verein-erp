import type { Role } from "@prisma/client";

// Yalnızca TİP aktarımı yapılır (çalışma zamanı bağımlılığı yoktur).
export type { Role };

/** HeroUI Chip bileşeninin "color" prop değerleri. */
export type ChipColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";

/**
 * Yeni bir rol Prisma enum'una eklendiğinde derleme hatası alınır
 * (Record<Role, ...> zorunlu kılar) ve etiketi/renki buraya eklenir.
 */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Yönetici",
  BOARD: "Yönetim Kurulu",
  SECRETARY: "Sekreter",
  VIEWER: "Salt okunur",
  TREASURER: "Sayman",
  AUDITOR: "Denetçi",
};

export const ROLE_COLORS: Record<Role, ChipColor> = {
  ADMIN: "primary",
  BOARD: "secondary",
  SECRETARY: "success",
  VIEWER: "default",
  TREASURER: "warning",
  AUDITOR: "danger",
};

export const ROLE_OPTIONS: { value: Role; label: string }[] = (
  Object.keys(ROLE_LABELS) as Role[]
).map((role) => ({ value: role, label: ROLE_LABELS[role] }));
