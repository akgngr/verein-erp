"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { listMemberOptions } from "@/modules/members/server";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { INVENTORY_BASE_PATH } from "../constants";
import { pickEarliestInspectionDate } from "../helpers/maintenance";
import { inventoryPermissions } from "../permissions";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "inventory.validation.dateInvalid");
const toDate = (v: string) => new Date(`${v}T00:00:00Z`);

const lendSchema = z.object({
  itemId: z.string().min(1).max(64),
  borrowerMemberId: z.string().min(1).max(64).nullable().optional(),
  borrowerName: z.string().trim().min(2).max(160),
  lentAt: isoDate,
  dueAt: isoDate.nullable(),
  note: z.string().trim().max(500).nullable(),
});

const returnSchema = z.object({
  loanId: z.string().min(1).max(64),
  returnedAt: isoDate,
});

const maintenanceSchema = z.object({
  itemId: z.string().min(1).max(64),
  kind: z.enum(["DGUV_V3", "TUV", "SERVICE", "OTHER"]),
  performedAt: isoDate,
  nextDueAt: isoDate.nullable(),
  inspector: z.string().trim().max(160).nullable(),
  passed: z.boolean(),
  note: z.string().trim().max(500).nullable(),
});

export async function lendInventoryItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: inventoryPermissions, action: "update" },
    schema: lendSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const item = await db.inventoryItem.findFirst({
        where: { id: input.itemId, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!item) throw new ActionError("inventory.errors.notFound");

      let borrowerMemberId: string | null = null;
      let borrowerName = input.borrowerName;
      if (input.borrowerMemberId) {
        const members = await listMemberOptions();
        const match = members.find((m) => m.id === input.borrowerMemberId);
        if (match) {
          borrowerMemberId = match.id;
          borrowerName = match.label;
        }
      }

      const created = await db.inventoryLoan.create({
        data: {
          itemId: input.itemId,
          borrowerMemberId,
          borrowerName,
          lentAt: toDate(input.lentAt),
          dueAt: input.dueAt ? toDate(input.dueAt) : null,
          note: input.note || null,
          createdById: user.id,
        },
        select: { id: true },
      });

      if (item.status === "IDLE") {
        await db.inventoryItem.update({
          where: { id: input.itemId },
          data: { status: "IN_USE" },
        });
      }

      await audit({
        action: "CREATE",
        entity: "InventoryLoan",
        entityId: created.id,
        after: { itemId: input.itemId, borrowerMemberId, lentAt: input.lentAt },
      });
      revalidatePath(INVENTORY_BASE_PATH);
      revalidatePath(`${INVENTORY_BASE_PATH}/bakim-ve-zimmet`);
      return created;
    },
  })(input);
}

export async function returnInventoryItemAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: inventoryPermissions, action: "update" },
    schema: returnSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const loan = await db.inventoryLoan.findUnique({
        where: { id: input.loanId },
        select: { id: true, itemId: true, returnedAt: true },
      });
      if (!loan || loan.returnedAt) throw new ActionError("inventory.errors.notFound");

      await db.inventoryLoan.update({
        where: { id: input.loanId },
        data: { returnedAt: toDate(input.returnedAt) },
      });

      const remainingOpen = await db.inventoryLoan.count({
        where: { itemId: loan.itemId, returnedAt: null },
      });
      if (remainingOpen === 0) {
        await db.inventoryItem.updateMany({
          where: { id: loan.itemId, status: "IN_USE", deletedAt: null },
          data: { status: "IDLE" },
        });
      }

      await audit({
        action: "UPDATE",
        entity: "InventoryLoan",
        entityId: loan.id,
        after: { returnedAt: input.returnedAt },
      });
      revalidatePath(INVENTORY_BASE_PATH);
      revalidatePath(`${INVENTORY_BASE_PATH}/bakim-ve-zimmet`);
      return null;
    },
  })(input);
}

export async function recordMaintenanceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: inventoryPermissions, action: "update" },
    schema: maintenanceSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const item = await db.inventoryItem.findFirst({
        where: { id: input.itemId, deletedAt: null },
        select: { id: true },
      });
      if (!item) throw new ActionError("inventory.errors.notFound");

      const created = await db.inventoryMaintenance.create({
        data: {
          itemId: input.itemId,
          kind: input.kind,
          performedAt: toDate(input.performedAt),
          nextDueAt: input.nextDueAt ? toDate(input.nextDueAt) : null,
          inspector: input.inspector || null,
          passed: input.passed,
          note: input.note || null,
          createdById: user.id,
        },
        select: { id: true },
      });

      if (input.nextDueAt) {
        const allMaintenance = await db.inventoryMaintenance.findMany({
          where: { itemId: input.itemId },
          select: { kind: true, performedAt: true, createdAt: true, nextDueAt: true },
        });
        const earliest = pickEarliestInspectionDate(allMaintenance);
        await db.inventoryItem.update({
          where: { id: input.itemId },
          data: { nextInspectionAt: earliest ?? toDate(input.nextDueAt) },
        });
      }

      await audit({
        action: "CREATE",
        entity: "InventoryMaintenance",
        entityId: created.id,
        after: { itemId: input.itemId, kind: input.kind, passed: input.passed },
      });
      revalidatePath(INVENTORY_BASE_PATH);
      revalidatePath(`${INVENTORY_BASE_PATH}/bakim-ve-zimmet`);
      return created;
    },
  })(input);
}
