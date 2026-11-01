import "server-only";

import type { MemberStatus, MembershipType } from "@prisma/client";

import { getDb } from "@/shared/db";
import { defineRecipients } from "@/shared/mailings/define";

import { membersPermissions } from "./permissions";

const STATUSES = ["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"];
const TYPES = ["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"];

/** Üyeler: durum ve türe göre; "Toplu e-posta istemiyor" (DSGVO Art. 21) işaretliler atlanır. */
export const recipients = defineRecipients("members", [
  {
    key: "members",
    permission: { definition: membersPermissions, action: "view" },
    placeholders: ["firstName", "lastName", "fullName", "membershipNumber"],
    filters: [
      { key: "status", options: STATUSES, defaults: ["ACTIVE"] },
      { key: "type", options: TYPES },
    ],
    sampleVars: { firstName: "Anna", lastName: "Muster", fullName: "Anna Muster", membershipNumber: "UYE-2026-0001" },
    resolve: async (filter) => {
      const statuses = (filter.status ?? []).filter((value) => STATUSES.includes(value)) as MemberStatus[];
      const types = (filter.type ?? []).filter((value) => TYPES.includes(value)) as MembershipType[];
      const rows = await getDb().member.findMany({
        where: { deletedAt: null, ...(statuses.length ? { status: { in: statuses } } : {}), ...(types.length ? { type: { in: types } } : {}) },
        select: { id: true, email: true, bulkMailOptOut: true, firstName: true, lastName: true, membershipNumber: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      return rows.map((row) => {
        const fullName = `${row.firstName} ${row.lastName}`.trim();
        return { id: row.id, email: row.email, name: fullName, optOut: row.bulkMailOptOut, vars: { firstName: row.firstName, lastName: row.lastName, fullName, membershipNumber: row.membershipNumber } };
      });
    },
  },
]);
