import { z } from "zod";

export const settingsSchema = z.object({
  provider: z.enum(["GOCARDLESS", "MOCK"]),
  secretId: z.string().trim().max(200).optional().default(""),
  secretKey: z.string().trim().max(500).optional().default(""),
});
export const institutionsSchema = z.object({ country: z.string().length(2).default("DE") });
export const startSchema = z.object({ institutionId: z.string().min(1).max(100), institutionName: z.string().min(1).max(200) });
export const idSchema = z.object({ id: z.string().min(1) });
export const mapSchema = z.object({ accountId: z.string().min(1), accountingAccountId: z.string().nullable() });
