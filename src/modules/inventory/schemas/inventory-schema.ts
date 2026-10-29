import { z } from "zod";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_PRICE_MAX,
  INVENTORY_QUANTITY_MAX,
  INVENTORY_STATUSES,
} from "../constants";
import { isValidIsoDate } from "../helpers/inventory-helpers";

/**
 * Error messages are i18n keys relative to the `inventory` namespace,
 * so the client can translate them with `t(message)`.
 */
const optionalText = (max: number) => z.string().trim().max(max, "validation.tooLong").optional();

export const inventoryCreateSchema = z.object({
  name: z.string().trim().min(1, "validation.nameRequired").max(200, "validation.tooLong"),
  category: z.enum(INVENTORY_CATEGORIES),
  serialNumber: optionalText(100),
  location: optionalText(200),
  quantity: z
    .number()
    .int("validation.quantityInteger")
    .min(1, "validation.quantityMin")
    .max(INVENTORY_QUANTITY_MAX, "validation.quantityMax"),
  status: z.enum(INVENTORY_STATUSES),
  purchaseDate: z
    .string()
    .refine((value) => value === "" || isValidIsoDate(value), "validation.dateInvalid")
    .optional(),
  purchasePrice: z
    .number()
    .min(0, "validation.priceMin")
    .max(INVENTORY_PRICE_MAX, "validation.priceMax")
    .nullable(),
  description: optionalText(2000),
  assignedMemberId: optionalText(100),
});

export const inventoryUpdateSchema = inventoryCreateSchema.extend({
  id: z.string().min(1),
});

export const inventoryStatusUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(INVENTORY_STATUSES),
});

export const inventoryIdSchema = z.object({
  id: z.string().min(1),
});

export type InventoryFormValues = z.infer<typeof inventoryCreateSchema>;
export type InventoryUpdateInput = z.infer<typeof inventoryUpdateSchema>;
export type InventoryStatusUpdateInput = z.infer<typeof inventoryStatusUpdateSchema>;
