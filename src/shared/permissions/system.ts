import type { PermissionDefinition } from "./define";

export const systemPermissions: PermissionDefinition = {
  resource: "system",
  grants: {
    ADMIN: ["view", "update", "delete"],
    BOARD: ["view"],
    SECRETARY: [],
    TREASURER: [],
    AUDITOR: [],
    VIEWER: [],
  },
};

export const settingsPermissions: PermissionDefinition = {
  resource: "settings",
  grants: {
    ADMIN: ["view"],
    BOARD: ["view"],
    SECRETARY: ["view"],
    TREASURER: ["view"],
    AUDITOR: ["view"],
    VIEWER: ["view"],
  },
};
