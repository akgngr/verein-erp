"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { youthProtectionPermissions } from "../permissions";
import {
  youthProtectionItemDeleteSchema,
  youthProtectionItemSchema,
  youthProtectionItemUpdateSchema,
} from "../schemas/item-schema";

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new ActionError("youth-protection.validation.dateInvalid");
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/**
 * Oluşturma: yetki + şema createAction'da.
 * DSGVO Art. 10 / Veri minimizasyonu: denetim kaydına yalnızca kişi adı yazılır.
 */
export async function createYouthProtectionItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: youthProtectionPermissions, action: "create" },
    schema: youthProtectionItemSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const created = await db.youthProtectionRecord.create({
        data: {
          personName: input.personName,
          memberId: input.memberId || null,
          userId: input.userId || null,
          inspectionDate: parseDateOnly(input.inspectionDate),
          certificateIssueDate: parseDateOnly(input.certificateIssueDate),
          inspectingOfficer: input.inspectingOfficer,
          nextDueDate: parseDateOnly(input.nextDueDate),
          status: input.status,
          activityEndedAt: input.activityEndedAt ? parseDateOnly(input.activityEndedAt) : null,
        },
      });
      await audit({
        action: "CREATE",
        entity: "YouthProtectionRecord",
        entityId: created.id,
        after: { personName: created.personName },
      });
      return { id: created.id };
    },
  });
  return run(input);
}

export async function updateYouthProtectionItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: youthProtectionPermissions, action: "update" },
    schema: youthProtectionItemUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.youthProtectionRecord.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("youth-protection.errors.notFound");

      const updated = await db.youthProtectionRecord.update({
        where: { id: existing.id },
        data: {
          personName: input.personName,
          memberId: input.memberId || null,
          userId: input.userId || null,
          inspectionDate: parseDateOnly(input.inspectionDate),
          certificateIssueDate: parseDateOnly(input.certificateIssueDate),
          inspectingOfficer: input.inspectingOfficer,
          nextDueDate: parseDateOnly(input.nextDueDate),
          status: input.status,
          activityEndedAt: input.activityEndedAt ? parseDateOnly(input.activityEndedAt) : null,
        },
      });

      await audit({
        action: "UPDATE",
        entity: "YouthProtectionRecord",
        entityId: updated.id,
        before: { personName: existing.personName },
        after: { personName: updated.personName },
      });
      return { id: updated.id };
    },
  });
  return run(input);
}

export async function deleteYouthProtectionItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: youthProtectionPermissions, action: "delete" },
    schema: youthProtectionItemDeleteSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.youthProtectionRecord.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("youth-protection.errors.notFound");

      await db.youthProtectionRecord.delete({ where: { id: existing.id } });
      await audit({
        action: "DELETE",
        entity: "YouthProtectionRecord",
        entityId: existing.id,
        before: { personName: existing.personName },
      });
      return { id: existing.id };
    },
  });
  return run(input);
}
