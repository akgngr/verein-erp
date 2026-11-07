import "server-only";

import type { MemberStatus, MembershipType, Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import { defineRecipients } from "@/shared/mailings/define";

import { membersPermissions } from "./permissions";

const STATUSES = ["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"];
const TYPES = ["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"];
const DUES = ["OPEN", "NONE"];

/**
 * Üyeler: durum, tür, şehir, üyelik yılı ve aidat durumuna göre segmentlenir; "Toplu e-posta istemiyor"
 * (DSGVO Art. 21) işaretliler atlanır.
 */
export const recipients = defineRecipients("members", [
  {
    key: "members",
    permission: { definition: membersPermissions, action: "view" },
    placeholders: ["firstName", "lastName", "fullName", "membershipNumber", "city"],
    filters: [
      { key: "status", options: STATUSES, defaults: ["ACTIVE"] },
      { key: "type", options: TYPES },
      {
        key: "city",
        options: [],
        loadOptions: async () =>
          (await getDb().member.findMany({ where: { deletedAt: null, city: { not: null } }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" }, take: 200 }))
            .map((row) => row.city as string)
            .filter(Boolean),
      },
      {
        key: "joinYear",
        options: [],
        loadOptions: async () => {
          const rows = await getDb().member.findMany({ where: { deletedAt: null }, select: { joinDate: true } });
          return [...new Set(rows.map((row) => String(row.joinDate.getUTCFullYear())))].sort().reverse();
        },
      },
      { key: "dues", options: DUES },
    ],
    sampleVars: { firstName: "Anna", lastName: "Muster", fullName: "Anna Muster", membershipNumber: "UYE-2026-0001", city: "Berlin" },
    resolve: async (filter) => {
      const statuses = (filter.status ?? []).filter((value) => STATUSES.includes(value)) as MemberStatus[];
      const types = (filter.type ?? []).filter((value) => TYPES.includes(value)) as MembershipType[];
      const cities = (filter.city ?? []).slice(0, 200);
      const years = (filter.joinYear ?? []).map(Number).filter((year) => year > 1900 && year < 3000);
      const dues = (filter.dues ?? []).filter((value) => DUES.includes(value));
      const openDue: Prisma.MemberWhereInput = { dues: { some: { status: { in: ["OPEN", "PARTIAL"] } } } };
      const where: Prisma.MemberWhereInput = {
        deletedAt: null,
        ...(statuses.length ? { status: { in: statuses } } : {}),
        ...(types.length ? { type: { in: types } } : {}),
        ...(cities.length ? { city: { in: cities } } : {}),
        AND: [
          ...(years.length ? [{ OR: years.map((year) => ({ joinDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } })) }] : []),
          // İkisi birden seçiliyse süzme yok.
          ...(dues.length === 1 ? [dues[0] === "OPEN" ? openDue : { NOT: openDue }] : []),
        ],
      };
      const rows = await getDb().member.findMany({
        where,
        select: { id: true, email: true, phone: true, bulkMailOptOut: true, messagingConsents: true, firstName: true, lastName: true, membershipNumber: true, city: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      return rows.map((row) => {
        const fullName = `${row.firstName} ${row.lastName}`.trim();
        return { id: row.id, email: row.email, phone: row.phone, consents: Object.fromEntries(row.messagingConsents.map((channel) => [channel, true])), name: fullName, optOut: row.bulkMailOptOut, vars: { firstName: row.firstName, lastName: row.lastName, fullName, membershipNumber: row.membershipNumber, city: row.city ?? "" } };
      });
    },
  },
]);
