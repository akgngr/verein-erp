import { definePermissions } from "@/shared/permissions/define";

/** CRM: kişiler, fırsatlar, zaman akışı, takipler. Kişi bilgisi ayrıca kaynak modülün iznine tabidir. */
export const crmPermissions = definePermissions("crm", {
  ADMIN: ["view", "create", "update", "delete", "approve"],
  BOARD: ["view", "create", "update", "delete"],
  SECRETARY: ["view", "create", "update"],
  TREASURER: ["view", "create", "update"],
  AUDITOR: ["view"],
  TEACHER: [],
  VIEWER: ["view"],
});
