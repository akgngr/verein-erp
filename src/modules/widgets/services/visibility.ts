import type { PermissionAction, PermissionDefinition } from "@/shared/permissions/define";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import type { WidgetRegistration } from "@/shared/widgets/registry";

/**
 * Server-authoritative widget visibility (#435). A widget is visible only if its module is usable
 * (active + access approved + licensed) and the user holds every `requiredPermissions` entry
 * (`<resource>:<action>`). Unknown resources or actions deny. User preferences (WP3) can only hide
 * optional widgets; they never add any.
 */
export function visibleWidgetIds(input: {
  registry: readonly WidgetRegistration[];
  usableModuleKeys: readonly string[];
  role: Role;
  resources: readonly { moduleKey: string; definitions: readonly PermissionDefinition[] }[];
}): string[] {
  const usable = new Set(input.usableModuleKeys);
  const byResource = new Map(input.resources.flatMap((entry) => entry.definitions.map((definition) => [definition.resource, definition] as const)));
  const allowed = (permission: string) => {
    const [resource, action] = permission.split(":");
    const definition = byResource.get(resource);
    return Boolean(definition && action && can(input.role, definition, action as PermissionAction));
  };
  return input.registry
    .filter(({ definition }) => usable.has(definition.moduleId) && (definition.requiredPermissions ?? []).every(allowed))
    .map(({ definition }) => definition.id);
}
