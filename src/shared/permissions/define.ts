import type { Role } from "../roles";

export type PermissionAction = "view" | "create" | "update" | "delete";

export type PermissionDefinition = {
  resource: string;
  grants: Record<Role, PermissionAction[]>;
};

/** Yetki gerektiren bir nav/aksiyon için taşınabilir kontrol bilgisi. */
export type PermissionCheck = {
  definition: PermissionDefinition;
  action: PermissionAction;
};

/**
 * Merkezi yetki matrisi YOKTUR: her modül kendi yetkilerini kendi
 * permissions.ts dosyasında bu yardımcı ile tanımlar.
 */
export function definePermissions(
  resource: string,
  grants: Record<Role, PermissionAction[]>,
): PermissionDefinition {
  return { resource, grants };
}

export function can(
  role: Role,
  definition: PermissionDefinition,
  action: PermissionAction,
): boolean {
  return definition.grants[role]?.includes(action) ?? false;
}
