"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getDb } from "@/shared/db";
import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { inventoryPermissions } from "../permissions";
import { INVENTORY_BASE_PATH } from "../constants";
import {
  inventoryCreateSchema,
  inventoryIdSchema,
  inventoryStatusUpdateSchema,
  inventoryUpdateSchema,
} from "../schemas/inventory-schema";
import { toInventoryWriteData } from "../helpers/inventory-helpers";
import type { InventoryActionResult } from "../types";

function toErrorResult(error: unknown): InventoryActionResult {
  // Let Next.js control-flow errors (redirect / notFound from auth) propagate.
  unstable_rethrow(error);

  if (error instanceof ForbiddenError) {
    return { ok: false, error: "forbidden" };
  }

  console.error(
    "[inventory] action failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return { ok: false, error: "unknown" };
}

async function itemExists(id: string): Promise<boolean> {
  const db = getDb();
  const item = await db.inventoryItem.findUnique({ where: { id }, select: { id: true } });
  return item !== null;
}

export async function createInventoryAction(input: unknown): Promise<InventoryActionResult> {
  try {
    await requirePermission(inventoryPermissions, "create");

    const parsed = inventoryCreateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const db = getDb();
    await db.inventoryItem.create({ data: toInventoryWriteData(parsed.data) });

    revalidatePath(INVENTORY_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateInventoryAction(input: unknown): Promise<InventoryActionResult> {
  try {
    await requirePermission(inventoryPermissions, "update");

    const parsed = inventoryUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const { id, ...values } = parsed.data;
    if (!(await itemExists(id))) return { ok: false, error: "notFound" };

    const db = getDb();
    await db.inventoryItem.update({ where: { id }, data: toInventoryWriteData(values) });

    revalidatePath(INVENTORY_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateInventoryStatusAction(input: unknown): Promise<InventoryActionResult> {
  try {
    await requirePermission(inventoryPermissions, "update");

    const parsed = inventoryStatusUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const { id, status } = parsed.data;
    if (!(await itemExists(id))) return { ok: false, error: "notFound" };

    const db = getDb();
    await db.inventoryItem.update({ where: { id }, data: { status } });

    revalidatePath(INVENTORY_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteInventoryAction(input: unknown): Promise<InventoryActionResult> {
  try {
    await requirePermission(inventoryPermissions, "delete");

    const parsed = inventoryIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const { id } = parsed.data;
    if (!(await itemExists(id))) return { ok: false, error: "notFound" };

    const db = getDb();
    await db.inventoryItem.delete({ where: { id } });

    revalidatePath(INVENTORY_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}
