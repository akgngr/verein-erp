import "server-only";

import { z } from "zod";

import type { SessionUser } from "@/modules/auth";

import type { AiFile, AiProposalDraft } from "../types";
import type { AiOperation } from "./permissions";

/** Asistan araçlarının ortak tanımları (tools.ts ve tools-extended.ts). */
export type ToolContext = {
  user: SessionUser;
  conversationId:string;
  policyRevision:string;
  proposals: AiProposalDraft[];
  /** Oluşturulan dosyalar yanıtın altında indirme düğmesi olarak gösterilir. */
  files: AiFile[];
  /** Model girdisindeki yer tutucuları ([PERSON_1] …) gerçek değerlere çevirir (yalnızca sunucuda). */
  restore: (text: string) => string;
};

export type ToolDefinition<S extends z.ZodType> = {
  name: string;
  contractVersion?:1|2;
  module: string;
  /** İzin matrisindeki işlem (kapalıysa araç modele hiç sunulmaz). */
  operation: AiOperation;
  processing?: "local_only";
  modelDataClass?: "aggregate" | "internal" | "pseudonymous";
  requiresContent?:boolean;
  allowed: (user: SessionUser) => boolean;
  description: string;
  schema: S;
  inputSchema: JsonSchema;
  run: (input: z.infer<S>, context: ToolContext) => Promise<unknown>;
};

export type JsonSchema = Record<string, unknown>;

export const define = <S extends z.ZodType>(tool: ToolDefinition<S>) => tool;
