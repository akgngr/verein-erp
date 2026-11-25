import { LOCKED_ROLE, type Role, type SystemRole } from "../roles";

export type PermissionAction = "view" | "create" | "update" | "delete" | "approve";
export const PERMISSION_ACTIONS: PermissionAction[] = ["view", "create", "update", "delete", "approve"];

/** Sistem rollerinin hepsi zorunlu; modül rolleri (örn. TEACHER) isteğe bağlı eklenir. */
export type PermissionGrants = Record<SystemRole, PermissionAction[]> & Partial<Record<string, PermissionAction[]>>;

export type PermissionDefinition = {
  resource: string;
  grants: PermissionGrants;
};

/** Yetki gerektiren bir nav/aksiyon için taşınabilir kontrol bilgisi. */
export type PermissionCheck = {
  definition: PermissionDefinition;
  action: PermissionAction;
};

/**
 * Merkezi yetki matrisi YOKTUR: her modül kendi yetkilerini kendi permissions.ts dosyasında
 * bu yardımcı ile tanımlar. Buradaki değerler VARSAYILANDIR; yönetici "Roller ve İzinler"
 * ekranından rol bazında değiştirebilir (bkz. PermissionPolicy). Kaynağın desteklediği işlemler
 * yöneticinin (ADMIN) varsayılan izinleridir.
 */
export function definePermissions(resource: string, grants: PermissionGrants): PermissionDefinition {
  return { resource, grants };
}

/**
 * Veritabanındaki rol politikası: yöneticinin değiştirdiği izinler ve şu an kullanılamayan
 * (modülü pasif/silinmiş) roller. Sunucuda her istekte requireUser yükler; istemciye düzen
 * (layout) aktarır.
 */
export type PermissionPolicy = {
  /** rol → kaynak → izinli işlemler (yalnızca varsayılandan farklı olanlar saklanır). */
  overrides: Record<string, Record<string, PermissionAction[]>>;
  /** Bu rollerin hiçbir izni yoktur (modülleri kullanılamıyor). */
  unavailableRoles: string[];
};

let activePolicy: PermissionPolicy | null = null;

/** Sunucu: requireUser yükler. İstemci: PermissionPolicyProvider ayarlar. */
export function setActivePermissionPolicy(policy: PermissionPolicy | null): void {
  activePolicy = policy;
}

export function getActivePermissionPolicy(): PermissionPolicy | null {
  return activePolicy;
}

/**
 * #582: Politikayı veritabanından yükleyen fonksiyon (RoleGrant geçersiz kılmaları, özel roller). `users`
 * modülü kaydeder (services/roles.ts); `shared` modül koduna bağımlı olmadan arka plan çalışanının (automation
 * worker) her görevden önce güncel politikayı yüklemesini sağlar. Web isteklerinde düzen (layout) ve
 * `requireUser` zaten yükler.
 */
type PermissionPolicyLoader = () => Promise<PermissionPolicy>;
let policyLoader: PermissionPolicyLoader | null = null;

export function registerPermissionPolicyLoader(loader: PermissionPolicyLoader): void {
  policyLoader = loader;
}

export class PermissionPolicyUnavailableError extends Error {
  constructor() {
    super("PERMISSION_POLICY_UNAVAILABLE");
    this.name = "PermissionPolicyUnavailableError";
  }
}

/**
 * Kayıtlı yükleyiciyle politikayı yükler ve etkinleştirir. Yükleyici yoksa hata verir (fail closed): aksi
 * halde `can(...)` geçersiz kılmaları ve özel rolleri yok sayıp varsayılan matrise göre izin verirdi.
 */
export async function refreshActivePermissionPolicy(): Promise<PermissionPolicy> {
  if (!policyLoader) throw new PermissionPolicyUnavailableError();
  const policy = await policyLoader();
  activePolicy = policy;
  return policy;
}

/** Politika uygulanmış izinler (rol + kaynak). Yönetici rolü değiştirilemez. */
export function effectiveActions(role: Role, definition: PermissionDefinition, policy: PermissionPolicy | null = activePolicy): PermissionAction[] {
  if (role === LOCKED_ROLE) return definition.grants[LOCKED_ROLE] ?? [];
  if (policy?.unavailableRoles.includes(role)) return [];
  const supported = definition.grants[LOCKED_ROLE] ?? [];
  const override = policy?.overrides[role]?.[definition.resource];
  if (override) return override.filter((action) => supported.includes(action));
  return definition.grants[role] ?? [];
}

export function can(role: Role, definition: PermissionDefinition, action: PermissionAction, policy: PermissionPolicy | null = activePolicy): boolean {
  return effectiveActions(role, definition, policy).includes(action);
}
