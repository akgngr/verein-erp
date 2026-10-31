import "server-only";

import { getDb } from "@/shared/db";
import {
  PERMISSION_ACTIONS,
  effectiveActions,
  setActivePermissionPolicy,
  type PermissionAction,
  type PermissionDefinition,
  type PermissionPolicy,
} from "@/shared/permissions/define";
import { CHIP_COLORS, LOCKED_ROLE, SYSTEM_ROLES, SYSTEM_ROLE_COLORS, type ChipColor, type RoleInfo } from "@/shared/roles";

import { permissionResources } from "@/permissions-registry";
import { allModules } from "@/registry";
import { listUsableModuleKeys } from "@/modules/system/server";

/**
 * Roller ve izinler (veritabanı). Politika = yöneticinin değiştirdiği izinler + modülü
 * kullanılamayan roller. Her sunucu isteğinde requireUser yükler; 5 sn önbellek, yazınca silinir.
 */
const CACHE_MS = 5_000;
let cache: { at: number; policy: PermissionPolicy; directory: RoleInfo[] } | null = null;

export function invalidatePermissionPolicy(): void {
  cache = null;
}

const moduleRoles = () => allModules.flatMap((mod) => (mod.roles ?? []).map((role) => ({ ...role, moduleKey: mod.key })));

async function build(): Promise<{ policy: PermissionPolicy; directory: RoleInfo[] }> {
  const db = getDb();
  const [grants, customRoles, usable] = await Promise.all([db.roleGrant.findMany(), db.customRole.findMany({ orderBy: { label: "asc" } }), listUsableModuleKeys()]);
  const usableSet = new Set(usable);
  const overrides: PermissionPolicy["overrides"] = {};
  for (const grant of grants) {
    if (grant.roleKey === LOCKED_ROLE) continue;
    (overrides[grant.roleKey] ??= {})[grant.resource] = grant.actions.filter((action): action is PermissionAction => (PERMISSION_ACTIONS as string[]).includes(action));
  }
  const fromModules = moduleRoles();
  const directory: RoleInfo[] = [
    ...SYSTEM_ROLES.map((key) => ({ key, kind: "system" as const, color: SYSTEM_ROLE_COLORS[key], available: true })),
    ...fromModules.map((role) => ({ key: role.key, kind: "module" as const, color: role.color, moduleKey: role.moduleKey, available: usableSet.has(role.moduleKey) })),
    ...customRoles.map((role) => ({
      key: role.key,
      kind: "custom" as const,
      color: (CHIP_COLORS.includes(role.color as ChipColor) ? role.color : "default") as ChipColor,
      label: role.label,
      description: role.description ?? undefined,
      available: true,
    })),
  ];
  const policy: PermissionPolicy = { overrides, unavailableRoles: directory.filter((role) => !role.available).map((role) => role.key) };
  return { policy, directory };
}

/** Politikayı yükler ve sunucudaki can(...) için etkinleştirir. */
export async function loadPermissionPolicy(): Promise<PermissionPolicy> {
  if (!cache || Date.now() - cache.at > CACHE_MS) cache = { at: Date.now(), ...(await build()) };
  setActivePermissionPolicy(cache.policy);
  return cache.policy;
}

export async function listRoleDirectory(): Promise<RoleInfo[]> {
  await loadPermissionPolicy();
  return cache?.directory ?? [];
}

/** Yeni kullanıcıya / değişiklikte atanabilir mi (var ve modülü kullanılabilir). */
export async function isAssignableRole(key: string): Promise<boolean> {
  return (await listRoleDirectory()).some((role) => role.key === key && role.available);
}

export type PermissionResource = { moduleKey: string; resource: string; supported: PermissionAction[]; definition: PermissionDefinition };

/** Kullanılabilir modüllerin izin kaynakları (Roller ve İzinler ekranı). */
export async function listPermissionResources(): Promise<PermissionResource[]> {
  const usable = new Set(await listUsableModuleKeys());
  return permissionResources
    .filter((entry) => entry.moduleKey === "system" || usable.has(entry.moduleKey))
    .flatMap((entry) =>
      entry.definitions.map((definition) => ({ moduleKey: entry.moduleKey, resource: definition.resource, supported: definition.grants[LOCKED_ROLE] ?? [], definition })),
    )
    .filter((resource) => resource.supported.length > 0);
}

/** Rolün tüm kaynaklardaki etkin izinleri ve varsayılandan farklı olanlar. */
export async function getRoleGrants(roleKey: string): Promise<{ resource: string; actions: PermissionAction[]; defaults: PermissionAction[]; customized: boolean }[]> {
  const policy = await loadPermissionPolicy();
  const resources = await listPermissionResources();
  return resources.map(({ resource, definition }) => {
    const defaults = roleKey === LOCKED_ROLE ? (definition.grants[LOCKED_ROLE] ?? []) : (definition.grants[roleKey] ?? []);
    return { resource, actions: effectiveActions(roleKey, definition, { ...policy, unavailableRoles: [] }), defaults, customized: Boolean(policy.overrides[roleKey]?.[resource]) };
  });
}

const findResource = async (resource: string) => (await listPermissionResources()).find((item) => item.resource === resource) ?? null;

/** Bir rolün bir kaynaktaki izinlerini ayarlar; varsayılana eşitse kayıt silinir. ADMIN değiştirilemez. */
export async function setRoleGrant(roleKey: string, resource: string, actions: PermissionAction[]): Promise<"ok" | "locked" | "unknownRole" | "unknownResource"> {
  if (roleKey === LOCKED_ROLE) return "locked";
  if (!(await listRoleDirectory()).some((role) => role.key === roleKey)) return "unknownRole";
  const item = await findResource(resource);
  if (!item) return "unknownResource";
  const cleaned = PERMISSION_ACTIONS.filter((action) => actions.includes(action) && item.supported.includes(action));
  const defaults = item.definition.grants[roleKey] ?? [];
  const isDefault = cleaned.length === defaults.length && cleaned.every((action) => defaults.includes(action));
  const db = getDb();
  if (isDefault) await db.roleGrant.deleteMany({ where: { roleKey, resource } });
  else await db.roleGrant.upsert({ where: { roleKey_resource: { roleKey, resource } }, create: { roleKey, resource, actions: cleaned }, update: { actions: cleaned } });
  invalidatePermissionPolicy();
  return "ok";
}

/** Rolün tüm değişikliklerini siler (koddaki varsayılana döner). */
export async function resetRoleGrants(roleKey: string): Promise<void> {
  await getDb().roleGrant.deleteMany({ where: { roleKey } });
  invalidatePermissionPolicy();
}

const slug = (label: string) =>
  label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30) || "ROLE";

/** Özel rol oluşturur; `copyFrom` verilirse o rolün etkin izinleri kopyalanır. */
export async function createCustomRole(input: { label: string; description: string | null; color: ChipColor; copyFrom: string | null }): Promise<string> {
  const db = getDb();
  const base = `C_${slug(input.label)}`;
  let key = base;
  for (let index = 2; await db.customRole.findUnique({ where: { key } }); index++) key = `${base}_${index}`;
  await db.customRole.create({ data: { key, label: input.label, description: input.description, color: input.color } });
  if (input.copyFrom && (await listRoleDirectory()).some((role) => role.key === input.copyFrom)) {
    const grants = await getRoleGrants(input.copyFrom);
    if (grants.length) await db.roleGrant.createMany({ data: grants.map((grant) => ({ roleKey: key, resource: grant.resource, actions: grant.actions })) });
  }
  invalidatePermissionPolicy();
  return key;
}

export async function updateCustomRole(key: string, input: { label: string; description: string | null; color: ChipColor }): Promise<boolean> {
  const result = await getDb().customRole.updateMany({ where: { key }, data: input });
  invalidatePermissionPolicy();
  return result.count > 0;
}

/** Yalnızca kullanıcısı olmayan özel rol silinir. */
export async function deleteCustomRole(key: string): Promise<"ok" | "inUse" | "notFound"> {
  const db = getDb();
  if (!(await db.customRole.findUnique({ where: { key } }))) return "notFound";
  if (await db.user.count({ where: { role: key } })) return "inUse";
  await db.$transaction([db.roleGrant.deleteMany({ where: { roleKey: key } }), db.customRole.delete({ where: { key } })]);
  invalidatePermissionPolicy();
  return "ok";
}

/** Rol başına kullanıcı sayısı. */
export async function countUsersByRole(): Promise<Record<string, number>> {
  const rows = await getDb().user.groupBy({ by: ["role"], _count: { _all: true } });
  return Object.fromEntries(rows.map((row) => [row.role, row._count._all]));
}
