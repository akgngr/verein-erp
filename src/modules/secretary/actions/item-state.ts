"use server";

import { revalidatePath } from "next/cache";

import { ActionError, createAction } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { secretaryPermissions } from "../permissions";
import { itemRefSchema, snoozeSchema } from "../schemas/item-state";
import {
  auditMeta,
  dismissItem,
  ItemStateError,
  prismaItemStateStore,
  restoreItem,
  snoozeItem,
} from "../services/item-state";

const store = () => prismaItemStateStore(getDb());

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ItemStateError) throw new ActionError(error.message);
    throw error;
  }
}

/** Özet öğesini kullanıcı için kapatır. Kaynak kayıt değişmez. */
export async function dismissItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: itemRefSchema,
    handler: async ({ input, user, audit }) => {
      const row = await dismissItem(store(), user.id, input.itemId);
      await audit({ action: "UPDATE", entity: "SecretaryItemState", entityId: row.id, after: auditMeta(input.itemId, "DISMISSED") });
      revalidatePath("/sekreter");
      return { id: row.id };
    },
  })(input);
}

/** Özet öğesini verilen zamana kadar erteler (gelecek tarih, en fazla 90 gün). */
export async function snoozeItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: snoozeSchema,
    handler: async ({ input, user, audit }) => {
      const until = new Date(input.until);
      const row = await guard(() => snoozeItem(store(), user.id, input.itemId, until, new Date()));
      await audit({ action: "UPDATE", entity: "SecretaryItemState", entityId: row.id, after: auditMeta(input.itemId, "SNOOZED", until) });
      revalidatePath("/sekreter");
      return { id: row.id };
    },
  })(input);
}

/** Kapatılan/ertelenen öğeyi yeniden gösterir. */
export async function restoreItemAction(input: unknown): Promise<ActionResult<{ restored: boolean }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: itemRefSchema,
    handler: async ({ input, user, audit }) => {
      const count = await restoreItem(store(), user.id, input.itemId);
      if (count > 0) await audit({ action: "DELETE", entity: "SecretaryItemState", after: auditMeta(input.itemId, "RESTORED") });
      revalidatePath("/sekreter");
      return { restored: count > 0 };
    },
  })(input);
}
