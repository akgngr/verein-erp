import "server-only";

import { AI_TOOL_POLICY,DATA_POLICY,type TablePolicy } from "@/shared/data-policy";
import { cloudToolAllowed } from "./cloud-policy";
import { createReferenceScope,saveDataset,loadDataset } from "./references";
import { assertUniqueToolNames } from "@/shared/ai/v2";
import type { z } from "zod";

import { requireCurrentAiAccess } from "./access";
import type { AiProviderId } from "./providers/registry";

import type { SessionUser } from "@/modules/auth";
import { listUsableModuleKeys } from "@/modules/system/server";
import { moduleAiRegistry } from "@/ai-registry";

import { getAiPermissions, isAllowed, type AiOperation } from "./permissions";
import { define, type ToolContext } from "./tool-kit";

/**
 * Asistanın araçları. Modül araçları her modülün kendi ai.ts dosyasından gelir (src/ai-registry.ts,
 * sözleşme: src/shared/ai/define.ts). KURAL (KVKK/DSGVO): hiçbir araç kişi adı, iletişim bilgisi,
 * adres, banka verisi veya kimlik numarası döndürmez. Her araç üç kapıdan geçer: yöneticinin izin
 * matrisinde (modül + işlem) açık, hedef modül kullanılabilir ve kullanıcının kendi yetkisi var.
 * Araçlar veriyi DEĞİŞTİRMEZ; yazma araçları yalnızca onay kartı önerir.
 */
/**
 * Modül AI standardı: her modülün ai.ts dosyasındaki araçlar (src/ai-registry.ts üretilir).
 * Araç `propose` çağırdığında genel bir onay kartı oluşur; eylem onayda yeniden denetlenir.
 */
const MODULE_TOOLS = moduleAiRegistry.flatMap((entry) =>
  entry.tools.map((tool) =>
    define({
      name: tool.name,
      contractVersion:"contractVersion" in tool && tool.contractVersion===2?2:1,
      module: entry.module,
      operation: tool.operation,
      processing: tool.processing,
      requiresContent:tool.requiresContent,
      allowed: (user) => tool.allowed(user),
      description: tool.description,
      schema: tool.schema,
      inputSchema: tool.inputSchema,
      run: (input, { user, proposals, files, restore,conversationId,policyRevision }) =>
        tool.run(input, {
          user,
          loadDatasetDefinition:async token=>{
            const data=await loadDataset({userId:user.id,conversationId,policyRevision},token);
            if(data.sourceModule!==entry.module)throw new Error("AI_DATASET_SOURCE_DENIED");
            return data.definition;
          },
          createDataset:async args=>{
            const policy=AI_TOOL_POLICY[tool.name as keyof typeof AI_TOOL_POLICY];
            if(!policy || !("serverReads" in policy) || !policy.serverReads.every(table=>DATA_POLICY[table].owner===entry.module && (DATA_POLICY as Record<string,TablePolicy>)[table].category!=="K0")) throw new Error("AI_DATASET_SOURCE_DENIED");
            const actor={userId:user.id,conversationId,policyRevision};
            const scope=await createReferenceScope(actor,"dataset-export");
            return saveDataset(actor,{scopeId:scope.id,sourceModule:entry.module,...args});
          },
          restore,
          attachFile: (file) => files.push(file),
          propose: (proposal) => {
            const action = entry.actions[proposal.action];
            if (!action) throw new Error(`[ai] ${entry.module}: bilinmeyen eylem ${proposal.action}`); // i18n-ignore (geliştirici hatası)
            proposals.push({ kind: "module", module: entry.module, action: proposal.action, operation: action.operation, title: proposal.title, details: proposal.details ?? [], payload: proposal.payload });
          },
        }),
    }),
  ),
);

for(const entry of moduleAiRegistry)for(const tool of entry.tools){
 if("contractVersion" in tool&&tool.contractVersion===2){
  const registered=AI_TOOL_POLICY[tool.name as keyof typeof AI_TOOL_POLICY];
  const policy="policy" in tool?tool.policy as {modelFields:readonly string[];serverReads:readonly string[]}:null;
  if(!registered||registered.module!==entry.module||!("modelFields" in registered)||!policy||policy.modelFields.some(field=>!registered.modelFields.some(allowed=>allowed===field)))throw new Error("AI_V2_POLICY_MISMATCH");
 }
}
assertUniqueToolNames(MODULE_TOOLS);
const TOOLS = MODULE_TOOLS;
const featureAvailable=(name:string)=>!["create_dues_dataset","query_dataset","propose_dataset_export"].includes(name)||process.env.AI_PERSONAL_EXPORT_ENABLED==="true";

/** Bu kullanıcı için şu an kullanılabilir araçlar (modül izni + kullanıcı yetkisi). */
export async function availableTools(user: SessionUser, provider?: AiProviderId) {
  const [usable, matrix] = await Promise.all([listUsableModuleKeys().then((keys) => new Set(keys)), getAiPermissions()]);
  return TOOLS.filter((tool) => isAllowed(matrix, tool.module, tool.operation) && (!tool.requiresContent||isAllowed(matrix,tool.module,"read_content")) && usable.has(tool.module) && tool.allowed(user) && featureAvailable(tool.name) && (provider === "local" || (tool.processing !== "local_only" && cloudToolAllowed(tool.name))));
}

export type UnavailableReason = "module" | "matrix" | "role" | "privacy" | "feature";

/**
 * Kullanıcının şu an KULLANAMADIĞI araçlar ve gerçek sebebi (ilk engelleyen kapı):
 *  - module: modül etkin değil ya da erişim onayı bekliyor (Ayarlar → Modül Yönetimi)
 *  - matrix: yönetici asistana bu modül/işlem için izin vermemiş (Ayarlar → Yapay zekâ)
 *  - role: kullanıcının rolünde ilgili izin yok (Kullanıcılar → Roller ve İzinler)
 * Asistan böylece "neden yapamıyorum" sorusuna tahmin yerine doğru cevap verir.
 */
export async function unavailableTools(user: SessionUser, provider?: AiProviderId): Promise<{ name: string; module: string; operation: AiOperation; reason: UnavailableReason }[]> {
  const [usable, matrix] = await Promise.all([listUsableModuleKeys().then((keys) => new Set(keys)), getAiPermissions()]);
  return TOOLS.flatMap((tool) => {
    const reason: UnavailableReason | null = !usable.has(tool.module) ? "module" : !isAllowed(matrix, tool.module, tool.operation) || (tool.requiresContent&&!isAllowed(matrix,tool.module,"read_content")) ? "matrix" : !tool.allowed(user) ? "role" : !featureAvailable(tool.name)?"feature":provider !== "local" && (tool.processing === "local_only" || !cloudToolAllowed(tool.name)) ? "privacy" : null;
    return reason ? [{ name: tool.name, module: tool.module, operation: tool.operation, reason }] : [];
  });
}

/** Matristeki her modül için asistanın gerçekten aracı olan işlemler (ayarlar ekranı). */
export function supportedOperations(): Record<string, AiOperation[]> {
  const result: Record<string, AiOperation[]> = {};
  for (const tool of TOOLS) {
    result[tool.module] = [...new Set([...(result[tool.module] ?? []), tool.operation,...(tool.requiresContent?["read_content" as const]:[])])];
  }
  return result;
}

export type AvailableTool = (typeof TOOLS)[number];


/** Girdi şemayla doğrulanır; geçersizse model hata sonucu alır. */
export async function runTool(tool: AvailableTool, rawInput: unknown, context: ToolContext, expectedProvider?: AiProviderId): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const parsed = (tool.schema as z.ZodType).safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  try {
    const { user, modules, provider } = await requireCurrentAiAccess(context.user.id, expectedProvider);
    const matrix=await getAiPermissions();
    if ((tool.requiresContent&&!isAllowed(matrix,tool.module,"read_content")) || !featureAvailable(tool.name) || !modules.includes(tool.module) || !isAllowed(await getAiPermissions(), tool.module, tool.operation) || !tool.allowed(user) || (provider !== "local" && (tool.processing === "local_only" || !cloudToolAllowed(tool.name)))) return { ok: false, error: "TOOL_NOT_AVAILABLE" };
    return { ok: true, value: await (tool.run as (input: unknown, context: ToolContext) => Promise<unknown>)(parsed.data, { ...context, user }) };
  } catch {
    console.error("[ai] TOOL_FAILED", { tool: tool.name });
    return { ok: false, error: "TOOL_FAILED" };
  }
}
