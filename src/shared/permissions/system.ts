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
