"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getDb } from "@/shared/db";
import { writeAudit } from "@/shared/audit/write-audit";
import { buildUserLabel } from "@/shared/utils";
import type { SessionUser } from "@/modules/auth";
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
import { canWriteAssetChange, syncItemToAccounting, type AssetRelevantFields } from "../services/asset-sync";

/**
 * #582:
 * - AfA'da izlenen eşyada muhasebe demirbaşını değiştiren işlem muhasebe yazma izni ister (`assetForbidden`).
 * - Her yazma işlemi denetim kaydı bırakır (açıklama ve atanan üye denetime yazılmaz).
 * - Silme yumuşaktır: kayıt korunur, listelerden kalkar; bağlı demirbaş muhasebede elden çıkarılır.
 */

function toErrorResult(error: unknown): InventoryActionResult {
  // Let Next.js control-flow errors (redirect / notFound from auth) propagate.
  unstable_rethrow(error);

  if (error instanceof ForbiddenError) {
    return { ok: false, error: "forbidden" };
  }

  console.error(
    "[inventory] action failed:",
    error instanceof Error ? error.message : String(error),
  );
  return { ok: false, error: "unknown" };
}

const AUDIT_SELECT = {
  name: true,
  category: true,
  status: true,
  quantity: true,
  purchaseDate: true,
  purchasePrice: true,
  trackAsAsset: true,
} as const;

type AuditedItem = AssetRelevantFields & { category: string; quantity: number };

async function findItem(id: string): Promise<AuditedItem | null> {
  return getDb().inventoryItem.findFirst({ where: { id, deletedAt: null }, select: AUDIT_SELECT });
}

/** Denetim kaydı için Decimal/Date alanlarını düz değere çevirir. */
function auditView(item: AuditedItem) {
  return {
    ...item,
    purchaseDate: item.purchaseDate ? item.purchaseDate.toISOString().slice(0, 10) : null,
    purchasePrice: item.purchasePrice === null ? null : Number(item.purchasePrice),
  };
}

async function auditInventory(user: SessionUser, action: string, entityId: string, before?: AuditedItem | null, after?: AuditedItem | null) {
  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action,
    entity: "InventoryItem",
    entityId,
    before: before ? auditView(before) : undefined,
    after: after ? auditView(after) : undefined,
  });
}

export async function createInventoryAction(input: unknown): Promise<InventoryActionResult> {
  try {
    const user = await requirePermission(inventoryPermissions, "create");

    const parsed = inventoryCreateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const data = toInventoryWriteData(parsed.data);
    if (!(await canWriteAssetChange(user.role, null, data))) return { ok: false, error: "assetForbidden" };

    const created = await getDb().inventoryItem.create({ data, select: { id: true, ...AUDIT_SELECT } });
    await syncItemToAccounting(created.id);
    await auditInventory(user, "CREATE", created.id, null, created);

    revalidatePath(INVENTORY_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateInventoryAction(input: unknown): Promise<InventoryActionResult> {
  try {
    const user = await requirePermission(inventoryPermissions, "update");

    const parsed = inventoryUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const { id, ...values } = parsed.data;
    const before = await findItem(id);
    if (!before) return { ok: false, error: "notFound" };

    const data = toInventoryWriteData(values);
    if (!(await canWriteAssetChange(user.role, before, data))) return { ok: false, error: "assetForbidden" };

    const after = await getDb().inventoryItem.update({ where: { id }, data, select: AUDIT_SELECT });
    await syncItemToAccounting(id);
    await auditInventory(user, "UPDATE", id, before, after);

    revalidatePath(INVENTORY_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateInventoryStatusAction(input: unknown): Promise<InventoryActionResult> {
  try {
    const user = await requirePermission(inventoryPermissions, "update");

    const parsed = inventoryStatusUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const { id, status } = parsed.data;
    const before = await findItem(id);
    if (!before) return { ok: false, error: "notFound" };
    if (!(await canWriteAssetChange(user.role, before, { ...before, status }))) return { ok: false, error: "assetForbidden" };

    const after = await getDb().inventoryItem.update({ where: { id }, data: { status }, select: AUDIT_SELECT });
    await syncItemToAccounting(id);
    await auditInventory(user, "STATUS_CHANGE", id, before, after);

    revalidatePath(INVENTORY_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteInventoryAction(input: unknown): Promise<InventoryActionResult> {
  try {
    const user = await requirePermission(inventoryPermissions, "delete");

    const parsed = inventoryIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const { id } = parsed.data;
    const before = await findItem(id);
    if (!before) return { ok: false, error: "notFound" };
    if (!(await canWriteAssetChange(user.role, before, null))) return { ok: false, error: "assetForbidden" };

    const result = await getDb().inventoryItem.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
    if (result.count !== 1) return { ok: false, error: "notFound" };
    await syncItemToAccounting(id, { deleted: true });
    await auditInventory(user, "DELETE", id, before, null);

    revalidatePath(INVENTORY_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}
