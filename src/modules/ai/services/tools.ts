import "server-only";

import type { z } from "zod";

import { can } from "@/shared/permissions/define";

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
      module: entry.module,
      operation: tool.operation,
      allowed: (user) => tool.allowed(user),
      description: tool.description,
      schema: tool.schema,
      inputSchema: tool.inputSchema,
      run: (input, { user, proposals, files, restore }) =>
        tool.run(input, {
          user,
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

const TOOLS = MODULE_TOOLS;

/** Bu kullanıcı için şu an kullanılabilir araçlar (modül izni + kullanıcı yetkisi). */
export async function availableTools(user: SessionUser) {
  const [usable, matrix] = await Promise.all([listUsableModuleKeys().then((keys) => new Set(keys)), getAiPermissions()]);
  return TOOLS.filter((tool) => isAllowed(matrix, tool.module, tool.operation) && usable.has(tool.module) && tool.allowed(user));
}

export type UnavailableReason = "module" | "matrix" | "role";

/**
 * Kullanıcının şu an KULLANAMADIĞI araçlar ve gerçek sebebi (ilk engelleyen kapı):
 *  - module: modül etkin değil ya da erişim onayı bekliyor (Ayarlar → Modül Yönetimi)
 *  - matrix: yönetici asistana bu modül/işlem için izin vermemiş (Ayarlar → Yapay zekâ)
 *  - role: kullanıcının rolünde ilgili izin yok (Kullanıcılar → Roller ve İzinler)
 * Asistan böylece "neden yapamıyorum" sorusuna tahmin yerine doğru cevap verir.
 */
export async function unavailableTools(user: SessionUser): Promise<{ name: string; module: string; operation: AiOperation; reason: UnavailableReason }[]> {
  const [usable, matrix] = await Promise.all([listUsableModuleKeys().then((keys) => new Set(keys)), getAiPermissions()]);
  return TOOLS.flatMap((tool) => {
    const reason: UnavailableReason | null = !usable.has(tool.module) ? "module" : !isAllowed(matrix, tool.module, tool.operation) ? "matrix" : !tool.allowed(user) ? "role" : null;
    return reason ? [{ name: tool.name, module: tool.module, operation: tool.operation, reason }] : [];
  });
}

/** Matristeki her modül için asistanın gerçekten aracı olan işlemler (ayarlar ekranı). */
export function supportedOperations(): Record<string, AiOperation[]> {
  const result: Record<string, AiOperation[]> = {};
  for (const tool of TOOLS) {
    result[tool.module] = [...new Set([...(result[tool.module] ?? []), tool.operation])];
  }
  return result;
}

export type AvailableTool = (typeof TOOLS)[number];


/** Girdi şemayla doğrulanır; geçersizse model hata sonucu alır. */
export async function runTool(tool: AvailableTool, rawInput: unknown, context: ToolContext): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const parsed = (tool.schema as z.ZodType).safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  try {
    return { ok: true, value: await (tool.run as (input: unknown, context: ToolContext) => Promise<unknown>)(parsed.data, context) };
  } catch (error) {
    console.error(`[ai] Araç hatası (${tool.name}):`, error);
    return { ok: false, error: "TOOL_FAILED" };
  }
}
