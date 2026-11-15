import "server-only";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";
import {aiProposalTools} from "./services/ai-proposal-tools";

import { z } from "zod";
import {aiListCursor,aiListPage,aiPageInfo} from "@/shared/ai/pagination";

import {aiAction} from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { inventoryPermissions } from "./permissions";
import { getInventorySnapshot, createInventoryAction, deleteInventoryAction, getInventoryCategorySummary, getInventoryStats, listInventoryItems, updateInventoryStatusAction } from "./server";

/** Envanter: zimmetli üye dönmez. Sözleşme: src/shared/ai/define.ts. */
const STATUS = z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]);
const createSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(["ELECTRONICS", "FURNITURE", "KITCHEN", "OFFICE", "SPORTS", "OTHER"]),
  quantity: z.number().int().min(1).max(100000),
  status: STATUS,
  location: z.string().max(200).nullable(),
  description: z.string().max(2000).nullable(),
});
/** Envanter eylemleri hata KODU döndürür; çeviri anahtarına çevrilir. */
const outcome = (result: { ok: boolean; error?: string }) =>
  result.ok ? { ok: true } : { ok: false, error: `ai.errors.inventory.${result.error}` }; // i18n-ignore (çeviri anahtarı)

export const ai = defineModuleAiV2({
  module: "inventory",
  tools: [
    aiToolV2({
      name: "get_inventory_overview",
      operation: "read",
      allowed: (user) => can(user.role, inventoryPermissions, "view"),
      description: "Inventory totals: item count, quantities in use / broken, and per-category summary.", // i18n-ignore (model-facing tool text)
      input: z.object({}),
      run: async () => ({ totals: await getInventoryStats(), byCategory: await getInventoryCategorySummary() }),
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "inventory-get-inventory-overview", "serverReads": ["InventoryItem"], "modelFields": ["totals", "totals.itemCount", "totals.totalQuantity", "totals.inUseQuantity", "totals.brokenQuantity", "byCategory", "byCategory.category", "byCategory.itemCount", "byCategory.totalQuantity"], "processing": "approved_provider", "modelDataClass": "aggregate"},
    }),
    aiToolV2({
      name: "list_inventory_items",
      operation: "read",
      allowed: (user) => can(user.role, inventoryPermissions, "view"),
      description: "Lists inventory items: id, name, category, status, quantity, location, purchase date and price (EUR). Assigned member is not included.", // i18n-ignore (model-facing tool text)
      input: z.object({ cursor:aiListCursor, query: z.string().max(100).nullable(), status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]).nullable() }),
      run: async ({ cursor,query, status }) => {
        const result = await listInventoryItems({ search: query ?? "", category: null, status, sort: "name", direction: "asc", requestedSort: null, requestedDirection: null, page: aiListPage(cursor), pageSize: 100 });
        return {
          ...aiPageInfo(aiListPage(cursor),100,result.total),
          items: result.items.map((item) => ({ id: item.id, name: item.name, category: item.category, status: item.status, quantity: item.quantity, location: item.location, purchaseDate: item.purchaseDate, purchasePriceEur: item.purchasePrice })),
        };
      },
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "inventory-list-inventory-items", "serverReads": ["InventoryItem"], "modelFields": ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.id", "items.name", "items.category", "items.status", "items.quantity", "items.location", "items.purchaseDate", "items.purchasePriceEur"], "processing": "approved_provider", "modelDataClass": "internal"},
    }),
    ...aiProposalTools,

  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: createSchema,
      execute: async (input) => outcome(await createInventoryAction({ ...input, location: input.location ?? "", description: input.description ?? "", purchasePrice: null })),
    }),
    changeStatus: aiAction({
      operation: "update",
      snapshot:({itemId})=>getInventorySnapshot(itemId),
      schema: z.object({ itemId: z.string().min(1).max(100), status: STATUS }),
      execute: async ({ itemId, status }) => outcome(await updateInventoryStatusAction({ id: itemId, status })),
    }),
    delete: aiAction({ operation: "delete", snapshot:({itemId})=>getInventorySnapshot(itemId), schema: z.object({ itemId: z.string().min(1).max(100) }), execute: async ({ itemId }) => outcome(await deleteInventoryAction({ id: itemId })) }),
  },
});
