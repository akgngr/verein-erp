/**
 * ROLLER (veritabanı tabanlı). Üç tür rol vardır:
 *  - Sistem rolleri (aşağıdaki liste): her kurulumda vardır, silinemez. Yönetici (ADMIN) kilitlidir.
 *  - Modül rolleri: modül `module.config.ts → roles` ile getirir (örn. kurslar → TEACHER). Modül
 *    kullanılamaz olduğunda rol seçilemez ve rolü taşıyan kullanıcıların izni olmaz.
 *  - Özel roller: yönetici "Roller ve İzinler" ekranından oluşturur (veritabanı: custom_roles).
 * İzinler kodda VARSAYILAN olarak tanımlanır; yönetici rol bazında değiştirebilir (role_grants).
 */
export type Role = string;

export const SYSTEM_ROLES = ["ADMIN", "BOARD", "SECRETARY", "TREASURER", "AUDITOR", "VIEWER"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

/** Yönetici rolü: izinleri değiştirilemez, her zaman koddaki tam yetkiyle çalışır. */
export const LOCKED_ROLE: SystemRole = "ADMIN";

/** HeroUI Chip bileşeninin "color" prop değerleri. */
export type ChipColor = "default" | "primary" | "secondary" | "success" | "warning" | "danger";
export const CHIP_COLORS: ChipColor[] = ["default", "primary", "secondary", "success", "warning", "danger"];

export const SYSTEM_ROLE_COLORS: Record<SystemRole, ChipColor> = {
  ADMIN: "primary",
  BOARD: "secondary",
  SECRETARY: "success",
  TREASURER: "warning",
  AUDITOR: "danger",
  VIEWER: "default",
};

export const isSystemRole = (role: string): role is SystemRole => (SYSTEM_ROLES as readonly string[]).includes(role);

/** Arayüzde gösterilen rol bilgisi (sunucu üretir, istemciye RolesProvider ile verilir). */
export type RoleInfo = {
  key: string;
  kind: "system" | "module" | "custom";
  color: ChipColor;
  /** Modül rolünün sahibi; etiket `<moduleKey>.roles.<key>.label` çevirisinden gelir. */
  moduleKey?: string;
  /** Yalnızca özel roller: kullanıcının girdiği ad ve açıklama. */
  label?: string;
  description?: string;
  /** false: rolün modülü kullanılamıyor (pasif/silinmiş) — yeni kullanıcıya atanamaz. */
  available: boolean;
};

/** Çeviri anahtarı: sistem → roles.<KEY>, modül → <modül>.roles.<KEY>.label; özel rol → kendi adı. */
export function roleLabelKey(info: Pick<RoleInfo, "key" | "kind" | "moduleKey">): string | null {
  if (info.kind === "system") return `roles.${info.key}`;
  if (info.kind === "module" && info.moduleKey) return `${info.moduleKey}.roles.${info.key}.label`;
  return null;
}
