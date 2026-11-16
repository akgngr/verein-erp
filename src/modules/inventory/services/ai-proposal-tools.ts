import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {proposalAcknowledgementSchema} from "@/shared/ai/dataset";
import {PROPOSED} from "@/shared/ai/define";
import {can} from "@/shared/permissions/define";
import {inventoryPermissions} from "../permissions";

/** Server-only proposal definitions; domain actions are invoked only by explicit confirmation. */
export const aiProposalTools=[
aiToolV2({
      name: "propose_inventory_item",
      operation: "create",
      allowed: (user) => can(user.role, inventoryPermissions, "create"),
      description: "PROPOSES adding an inventory item. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
      input:(z.object({
        name: z.string().min(1).max(200),
        category: z.enum(["ELECTRONICS", "FURNITURE", "KITCHEN", "OFFICE", "SPORTS", "OTHER"]),
        quantity: z.number().int().min(1).max(100000),
        status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]),
        location: z.string().max(200).nullable(),
        description: z.string().max(2000).nullable(),
      })).strict(),
      result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
      policy:{"purpose":"inventory-proposal","serverReads":[],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ name, ...rest }, { propose }) => {
        propose({ action: "create", title: name, details: [rest.category, `× ${rest.quantity}`, rest.location ?? ""].filter(Boolean), payload: { name, ...rest } });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_inventory_status",
      operation: "update",
      allowed: (user) => can(user.role, inventoryPermissions, "update"),
      description: "PROPOSES changing an inventory item's status (id from list_inventory_items).", // i18n-ignore (model-facing tool text)
      input:(z.object({ itemId: z.string().min(1).max(100), name: z.string().max(200), status: z.enum(["IN_USE", "IDLE", "BROKEN", "SCRAPPED"]) })).strict(),
      result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
      policy:{"purpose":"inventory-proposal","serverReads":[],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ itemId, name, status }, { propose }) => {
        propose({ action: "changeStatus", title: name, details: [`→ ${status}`], payload: { itemId, status } });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_delete_inventory_item",
      operation: "delete",
      allowed: (user) => can(user.role, inventoryPermissions, "delete"),
      description: "PROPOSES deleting an inventory item (id from list_inventory_items).", // i18n-ignore (model-facing tool text)
      input:(z.object({ itemId: z.string().min(1).max(100), name: z.string().max(200) })).strict(),
      result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
      policy:{"purpose":"inventory-proposal","serverReads":[],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ itemId, name }, { propose }) => {
        propose({ action: "delete", title: name, payload: { itemId } });
        return PROPOSED;
      },
    })
];
