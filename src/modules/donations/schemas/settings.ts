import { z } from "zod";

/** Şablon metin onayı (§ 14): sürüm sunucuda TEMPLATE_VERSION ile yazılır. */
export const confirmTemplateSchema = z.object({});

export type ConfirmTemplateInput = z.infer<typeof confirmTemplateSchema>;
