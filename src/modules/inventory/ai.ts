import "server-only";

import { z } from "zod";

import { NO_INPUT, PROPOSED, aiAction, aiTool, defineModuleAi } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { inventoryPermissions } from "./permissions";
import { createInventoryAction, deleteInventoryAction, getInventoryCategorySummary, getInventoryStats, listInventoryItems, updateInventoryStatusAction } from "./server";

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

export const ai = defineModuleAi({
  module: "inventory",
  tools: [
    aiTool({
      name: "get_inventory_overview",
      operation: "read",
      allowed: (user) => can(user.role, inventoryPermissions, "view"),
      description: "Inventory totals: item count, quantities in use / broken, and per-category summary.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: NO_INPUT,
      run: async () => ({ totals: await getInventoryStats(), byCategory: await getInventoryCategorySummary() }),
    }),
    aiTool({
      name: "list_inventory_items",
      operation: "read",
      allowed: (user) => can(user.role, inventoryPermissions, "view"),
      description: "Lists inventory items: id, name, category, status, quantity, location, purchase date and price (EUR). Assigned member is not included.", // i18n-ignore (model-facing tool text)
      schema: z.object({ query: z.string().max(100).nullable(), status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]).nullable() }),
      inputSchema: {
        type: "object",
        properties: { query: { type: ["string", "null"] }, status: { type: ["string", "null"], enum: ["IN_USE", "IDLE", "BROKEN", "SCRAPPED", null] } },
        required: ["query", "status"],
        additionalProperties: false,
      },
      run: async ({ query, status }) => {
        const result = await listInventoryItems({ search: query ?? "", category: null, status, sort: "name", direction: "asc", requestedSort: null, requestedDirection: null, page: 1, pageSize: 100 });
        return {
          total: result.total,
          items: result.items.map((item) => ({ id: item.id, name: item.name, category: item.category, status: item.status, quantity: item.quantity, location: item.location, purchaseDate: item.purchaseDate, purchasePriceEur: item.purchasePrice })),
        };
      },
    }),
    aiTool({
      name: "propose_inventory_item",
      operation: "create",
      allowed: (user) => can(user.role, inventoryPermissions, "create"),
      description: "PROPOSES adding an inventory item. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
      schema: z.object({
        name: z.string().min(1).max(200),
        category: z.enum(["ELECTRONICS", "FURNITURE", "KITCHEN", "OFFICE", "SPORTS", "OTHER"]),
        quantity: z.number().int().min(1).max(100000),
        status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]),
        location: z.string().max(200).nullable(),
        description: z.string().max(2000).nullable(),
      }),
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string", enum: ["ELECTRONICS", "FURNITURE", "KITCHEN", "OFFICE", "SPORTS", "OTHER"] },
          quantity: { type: "integer" },
          status: { type: "string", enum: ["IN_USE", "IDLE", "BROKEN", "SCRAPPED"] },
          location: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
        required: ["name", "category", "quantity", "status", "location", "description"],
        additionalProperties: false,
      },
      run: async ({ name, ...rest }, { propose }) => {
        propose({ action: "create", title: name, details: [rest.category, `× ${rest.quantity}`, rest.location ?? ""].filter(Boolean), payload: { name, ...rest } });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_inventory_status",
      operation: "update",
      allowed: (user) => can(user.role, inventoryPermissions, "update"),
      description: "PROPOSES changing an inventory item's status (id from list_inventory_items).", // i18n-ignore (model-facing tool text)
      schema: z.object({ itemId: z.string().min(1).max(100), name: z.string().max(200), status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]) }),
      inputSchema: {
        type: "object",
        properties: { itemId: { type: "string" }, name: { type: "string", description: "Item name as listed" }, status: { type: "string", enum: ["IN_USE", "IDLE", "BROKEN", "SCRAPPED"] } }, // i18n-ignore (model-facing tool text)
        required: ["itemId", "name", "status"],
        additionalProperties: false,
      },
      run: async ({ itemId, name, status }, { propose }) => {
        propose({ action: "changeStatus", title: name, details: [`→ ${status}`], payload: { itemId, status } });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_delete_inventory_item",
      operation: "delete",
      allowed: (user) => can(user.role, inventoryPermissions, "delete"),
      description: "PROPOSES deleting an inventory item (id from list_inventory_items).", // i18n-ignore (model-facing tool text)
      schema: z.object({ itemId: z.string().min(1).max(100), name: z.string().max(200) }),
      inputSchema: { type: "object", properties: { itemId: { type: "string" }, name: { type: "string" } }, required: ["itemId", "name"], additionalProperties: false },
      run: async ({ itemId, name }, { propose }) => {
        propose({ action: "delete", title: name, payload: { itemId } });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: createSchema,
      execute: async (input) => outcome(await createInventoryAction({ ...input, location: input.location ?? "", description: input.description ?? "", purchasePrice: null })),
    }),
    changeStatus: aiAction({
      operation: "update",
      schema: z.object({ itemId: z.string().min(1).max(100), status: STATUS }),
      execute: async ({ itemId, status }) => outcome(await updateInventoryStatusAction({ id: itemId, status })),
    }),
    delete: aiAction({ operation: "delete", schema: z.object({ itemId: z.string().min(1).max(100) }), execute: async ({ itemId }) => outcome(await deleteInventoryAction({ id: itemId })) }),
  },
});
