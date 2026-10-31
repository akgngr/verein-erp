import "server-only";

import { z } from "zod";

import type { SessionUser } from "@/modules/auth";

import type { AiProposal } from "../types";
import type { AiOperation } from "./permissions";

/** Asistan araçlarının ortak tanımları (tools.ts ve tools-extended.ts). */
export type ToolContext = {
  user: SessionUser;
  proposals: AiProposal[];
  /** Model girdisindeki yer tutucuları ([PERSON_1] …) gerçek değerlere çevirir (yalnızca sunucuda). */
  restore: (text: string) => string;
};

export type ToolDefinition<S extends z.ZodType> = {
  name: string;
  module: string;
  /** İzin matrisindeki işlem (kapalıysa araç modele hiç sunulmaz). */
  operation: AiOperation;
  allowed: (user: SessionUser) => boolean;
  description: string;
  schema: S;
  inputSchema: JsonSchema;
  run: (input: z.infer<S>, context: ToolContext) => Promise<unknown>;
};

export type JsonSchema = Record<string, unknown>;

export const define = <S extends z.ZodType>(tool: ToolDefinition<S>) => tool;
export const yearSchema = z.object({ year: z.number().int().min(2000).max(2100) });
export const YEAR_INPUT: JsonSchema = {
  type: "object",
  properties: { year: { type: "integer", description: "Fiscal year, e.g. 2026" } }, // i18n-ignore (model-facing tool text)
  required: ["year"],
  additionalProperties: false,
};
export const euros = (cents: number) => Math.round(cents) / 100;
