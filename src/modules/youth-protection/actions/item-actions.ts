"use server";

import { revalidatePath } from "next/cache";

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
 * #585: Denetim kaydına kişi adı YAZILMAZ (§ 72a Abs. 5 SGB VIII, DSGVO md. 10): adli sicil incelemesine
 * ilişkin veriler kalıcı denetim izine taşınmaz. Yalnız kayıt kimliği, durum ve tarihler yazılır.
 */
function auditView(record: { status: string; nextDueDate: Date; activityEndedAt: Date | null; memberId: string | null; userId: string | null }) {
  return {
    status: record.status,
    nextDueDate: record.nextDueDate.toISOString().slice(0, 10),
    activityEnded: Boolean(record.activityEndedAt),
    linkedMember: Boolean(record.memberId),
    linkedUser: Boolean(record.userId),
  };
}

/** Bağlanan üye kaydı members public API'siyle doğrulanır (etkin/pasif üye). */
async function assertMember(memberId: string | null): Promise<void> {
  if (!memberId) return;
  const { listMemberOptions } = await import("@/modules/members/server");
  if ((await listMemberOptions({ ids: [memberId] })).length === 0) {
    throw new ActionError("youth-protection.errors.memberNotFound", { memberId: ["youth-protection.errors.memberNotFound"] });
  }
}

const LIST_PATH = "/youth-protection";

/** Oluşturma: yetki + şema createAction'da. */
export async function createYouthProtectionItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: youthProtectionPermissions, action: "create" },
    schema: youthProtectionItemSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      await assertMember(input.memberId || null);
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
        after: auditView(created),
      });
      revalidatePath(LIST_PATH);
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
      await assertMember(input.memberId || null);

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
        before: auditView(existing),
        after: auditView(updated),
      });
      revalidatePath(LIST_PATH);
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
        before: auditView(existing),
      });
      revalidatePath(LIST_PATH);
      return { id: existing.id };
    },
  });
  return run(input);
}
