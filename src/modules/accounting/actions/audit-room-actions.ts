"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { accountingPermissions } from "../permissions";
import {
  addAuditFinding,
  createAuditRoom,
  resolveAuditFinding,
  revokeAuditRoom,
  saveAuditChecklistItem,
} from "../services/audit-room";
import { AUDIT_ROOM_SECTIONS } from "../services/audit-room-core";

const sectionEnum = z.enum(AUDIT_ROOM_SECTIONS);
const severityEnum = z.enum(["INFO", "NOTE", "ISSUE"]);

export async function createAuditRoomAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: z.object({
      year: z.number().int().min(2000).max(2100),
      title: z.string().trim().min(2).max(160),
      auditorUserId: z.string().trim().min(1).max(64).nullable().optional(),
      startsAt: z.string().datetime(),
      expiresAt: z.string().datetime(),
    }),
    handler: async ({ user, input, audit }) => {
      const created = await createAuditRoom({
        year: input.year,
        title: input.title,
        auditorUserId: input.auditorUserId ?? null,
        startsAt: new Date(input.startsAt),
        expiresAt: new Date(input.expiresAt),
        actorId: user.id,
        actorLabel: buildUserLabel(user.name, user.email),
      });
      await audit({
        action: "CREATE",
        entity: "AccountingAuditRoom",
        entityId: created.id,
        after: { year: input.year, expiresAt: input.expiresAt, scopedAuditor: Boolean(input.auditorUserId) },
      });
      revalidatePath("/muhasebe/denetim");
      return created;
    },
  })(input);
}

export async function revokeAuditRoomAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: z.object({ roomId: z.string().min(1).max(64) }),
    handler: async ({ input, audit }) => {
      await revokeAuditRoom(input.roomId);
      await audit({ action: "UPDATE", entity: "AccountingAuditRoom", entityId: input.roomId, after: { revoked: true } });
      revalidatePath("/muhasebe/denetim");
      return null;
    },
  })(input);
}

export async function toggleAuditChecklistAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: accountingPermissions, action: "view" },
    schema: z.object({
      roomId: z.string().min(1).max(64),
      section: sectionEnum,
      checked: z.boolean(),
      note: z.string().trim().max(500).nullable().optional(),
    }),
    handler: async ({ user, input, audit }) => {
      await saveAuditChecklistItem(
        { id: user.id, role: user.role, label: buildUserLabel(user.name, user.email) },
        { roomId: input.roomId, section: input.section, checked: input.checked, note: input.note ?? null },
      );
      await audit({
        action: "UPDATE",
        entity: "AccountingAuditChecklistItem",
        entityId: input.roomId,
        after: { section: input.section, checked: input.checked },
      });
      revalidatePath("/muhasebe/denetim");
      return null;
    },
  })(input);
}

export async function addAuditFindingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: accountingPermissions, action: "view" },
    schema: z.object({
      roomId: z.string().min(1).max(64),
      section: sectionEnum,
      severity: severityEnum,
      summary: z.string().trim().min(3).max(240),
      detail: z.string().trim().max(2000).nullable().optional(),
    }),
    handler: async ({ user, input, audit }) => {
      const created = await addAuditFinding(
        { id: user.id, role: user.role, label: buildUserLabel(user.name, user.email) },
        { roomId: input.roomId, section: input.section, severity: input.severity, summary: input.summary, detail: input.detail ?? null },
      );
      await audit({
        action: "CREATE",
        entity: "AccountingAuditFinding",
        entityId: created.id,
        after: { roomId: input.roomId, section: input.section, severity: input.severity },
      });
      revalidatePath("/muhasebe/denetim");
      return created;
    },
  })(input);
}

export async function resolveAuditFindingAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: accountingPermissions, action: "view" },
    schema: z.object({ findingId: z.string().min(1).max(64) }),
    handler: async ({ user, input, audit }) => {
      await resolveAuditFinding({ id: user.id, role: user.role }, input.findingId);
      await audit({
        action: "UPDATE",
        entity: "AccountingAuditFinding",
        entityId: input.findingId,
        after: { status: "RESOLVED" },
      });
      revalidatePath("/muhasebe/denetim");
      return null;
    },
  })(input);
}
