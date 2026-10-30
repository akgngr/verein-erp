import { accountingPermissions, accountingSetupPermissions } from "@/modules/accounting";
import { auditPermissions } from "@/modules/audit";
import { documentsPermissions, documentCategoriesPermissions } from "@/modules/documents";
import { donationsPermissions } from "@/modules/donations";
import { meetingsPermissions } from "@/modules/meetings";
import { membersPermissions, memberPaymentsPermissions, memberTypesPermissions } from "@/modules/members";
import { organizationPermissions } from "@/modules/organization";
import { systemPermissions, settingsPermissions } from "@/shared/permissions/system";
import type { PermissionAction, PermissionDefinition } from "@/shared/permissions/define";
import type { Role, ChipColor } from "@/shared/roles";

import { usersPermissions } from "./permissions";

/**
 * Yetki matrisi yapısı. Görünen metinler `users.matrix.*` çevirilerinden gelir:
 * roles.<ROLE>.{label,shortDesc,legalContext}, modules.<moduleKey>,
 * resources.<resourceKey>.{label,description}.
 */
export type PermissionResourceMeta = {
  moduleKey: string;
  resourceKey: string;
  definition: PermissionDefinition;
  supportedActions: PermissionAction[];
};

export type RoleMeta = {
  role: Role;
  badgeColor: ChipColor;
};

export const ALL_ROLES_META: RoleMeta[] = [
  {
    role: "ADMIN",
    badgeColor: "primary",
  },
  {
    role: "BOARD",
    badgeColor: "secondary",
  },
  {
    role: "SECRETARY",
    badgeColor: "success",
  },
  {
    role: "TREASURER",
    badgeColor: "warning",
  },
  {
    role: "AUDITOR",
    badgeColor: "danger",
  },
  {
    role: "VIEWER",
    badgeColor: "default",
  },
  {
    role: "TEACHER",
    badgeColor: "secondary",
  },
];

export const ALL_RESOURCES_META: PermissionResourceMeta[] = [
  {
    moduleKey: "documents",
    resourceKey: "documents",
    definition: documentsPermissions,
    supportedActions: ["view", "create", "update", "delete"],
  },
  {
    moduleKey: "documents",
    resourceKey: "documentCategories",
    definition: documentCategoriesPermissions,
    supportedActions: ["view", "create", "update"],
  },
  {
    moduleKey: "meetings",
    resourceKey: "meetings",
    definition: meetingsPermissions,
    supportedActions: ["view", "create", "update", "delete", "approve"],
  },
  {
    moduleKey: "members",
    resourceKey: "members",
    definition: membersPermissions,
    supportedActions: ["view", "create", "update", "delete"],
  },
  {
    moduleKey: "members",
    resourceKey: "memberPayments",
    definition: memberPaymentsPermissions,
    supportedActions: ["view", "create", "update", "delete"],
  },
  {
    moduleKey: "members",
    resourceKey: "memberTypes",
    definition: memberTypesPermissions,
    supportedActions: ["view", "create", "update"],
  },
  {
    moduleKey: "accounting",
    resourceKey: "accounting",
    definition: accountingPermissions,
    supportedActions: ["view", "create", "update", "delete", "approve"],
  },
  {
    moduleKey: "accounting",
    resourceKey: "accountingSetup",
    definition: accountingSetupPermissions,
    supportedActions: ["view", "create", "update"],
  },
  {
    moduleKey: "donations",
    resourceKey: "donations",
    definition: donationsPermissions,
    supportedActions: ["view", "create", "update", "delete", "approve"],
  },
  {
    moduleKey: "organization",
    resourceKey: "organization",
    definition: organizationPermissions,
    supportedActions: ["view", "update"],
  },
  {
    moduleKey: "users",
    resourceKey: "users",
    definition: usersPermissions,
    supportedActions: ["view", "create", "update"],
  },
  {
    moduleKey: "audit",
    resourceKey: "audit",
    definition: auditPermissions,
    supportedActions: ["view"],
  },
  {
    moduleKey: "system",
    resourceKey: "system",
    definition: systemPermissions,
    supportedActions: ["view", "update", "delete"],
  },
  {
    moduleKey: "system",
    resourceKey: "settings",
    definition: settingsPermissions,
    supportedActions: ["view"],
  },
];
