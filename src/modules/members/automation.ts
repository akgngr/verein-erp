import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

const MEMBER_VARIABLE_FIELDS = ["firstName", "lastName", "fullName", "membershipNumber", "email", "joinDate"] as const;

/**
 * Yeni üye kaydı. Kuyruğa giden yük yalnızca kimlik, tür ve durum taşır.
 * Ad gibi alanlar e-posta metninde {{member.fullName}} ile kullanılabilir; bunlar
 * yalnızca gönderim anında worker'da üye kaydından okunur, saklanmaz.
 */
export const memberCreatedEvent = defineEvent({
  key: "members.created",
  description: "members.created",
  payloadSchema: z.object({
    memberId: z.string().min(1).max(128),
    type: z.enum(["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"]),
    status: z.enum(["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"]),
  }).strict(),
  variables: {
    namespace: "member",
    fields: MEMBER_VARIABLE_FIELDS,
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const member = await getDb().member.findUnique({
        where: { id: payload.memberId },
        select: { firstName: true, lastName: true, membershipNumber: true, email: true, joinDate: true },
      });
      if (!member) return {};
      return {
        firstName: member.firstName,
        lastName: member.lastName,
        fullName: `${member.firstName} ${member.lastName}`.trim(),
        membershipNumber: member.membershipNumber,
        email: member.email ?? null,
        joinDate: member.joinDate ? member.joinDate.toISOString().slice(0, 10) : null,
      };
    },
  },
});
