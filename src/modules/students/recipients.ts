import "server-only";

import { getDb } from "@/shared/db";
import { defineRecipients } from "@/shared/mailings/define";

import { studentsPermissions } from "./permissions";

/** Veliler (ödeme sorumluları): aktif öğrencisi olan / tüm veliler. */
export const recipients = defineRecipients("students", [
  {
    key: "guardians",
    permission: { definition: studentsPermissions, action: "view" },
    placeholders: ["firstName", "lastName", "fullName", "salutation"],
    filters: [{ key: "scope", options: ["WITH_STUDENTS", "ALL"], defaults: ["WITH_STUDENTS"] }],
    sampleVars: { firstName: "Clara", lastName: "Beispiel", fullName: "Clara Beispiel", salutation: "Frau" },
    resolve: async (filter) => {
      const onlyActive = !(filter.scope ?? []).includes("ALL");
      const rows = await getDb().studentGuardian.findMany({
        where: { deletedAt: null, ...(onlyActive ? { students: { some: { student: { deletedAt: null } } } } : {}) },
        select: { id: true, email: true, firstName: true, lastName: true, salutation: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      return rows.map((row) => {
        const fullName = `${row.firstName} ${row.lastName}`.trim();
        return { id: row.id, email: row.email, name: fullName, optOut: false, vars: { firstName: row.firstName, lastName: row.lastName, fullName, salutation: row.salutation ?? "" } };
      });
    },
  },
]);
