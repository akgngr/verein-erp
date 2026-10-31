import "server-only";

import { z } from "zod";

import { can } from "@/shared/permissions/define";

import type { SessionUser } from "@/modules/auth";
import { listUsableModuleKeys } from "@/modules/system/server";
import { moduleAiRegistry } from "@/ai-registry";

import { getAiPermissions, isAllowed, type AiOperation } from "./permissions";
import { saveReport } from "./reports";
import { define, type ToolContext } from "./tool-kit";

/**
 * Asistanın araçları. Modül araçları her modülün kendi ai.ts dosyasından gelir (src/ai-registry.ts,
 * sözleşme: src/shared/ai/define.ts). KURAL (KVKK/DSGVO): hiçbir araç kişi adı, iletişim bilgisi,
 * adres, banka verisi veya kimlik numarası döndürmez. Her araç üç kapıdan geçer: yöneticinin izin
 * matrisinde (modül + işlem) açık, hedef modül kullanılabilir ve kullanıcının kendi yetkisi var.
 * Araçlar veriyi DEĞİŞTİRMEZ; yazma araçları yalnızca onay kartı önerir.
 */
const AI_TOOLS = [
  define({
    name: "create_pdf_report",
    module: "ai",
    operation: "read",
    allowed: () => true,
    description:
      "Creates a PDF (with the association letterhead) from markdown you provide — headings, paragraphs, lists and tables — and returns a download link. Use it whenever the user asks for a PDF of an answer, table or summary. Put the complete content into markdown; it does not fetch any data itself.", // i18n-ignore (model-facing tool text)
    schema: z.object({ title: z.string().min(1).max(150), markdown: z.string().min(1).max(60_000) }),
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" }, markdown: { type: "string", description: "Full report content in markdown (tables allowed)" } }, // i18n-ignore (model-facing tool text)
      required: ["title", "markdown"],
      additionalProperties: false,
    },
    run: async ({ title, markdown }, { user, restore }) => {
      const id = await saveReport(user.id, restore(title), restore(markdown));
      return { url: `/api/ai/reports/${id}/pdf`, note: "Give this link to the user as a markdown link." }; // i18n-ignore (model-facing tool text)
    },
  }),
];

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
      run: (input, { user, proposals }) =>
        tool.run(input, {
          user,
          propose: (proposal) => {
            const action = entry.actions[proposal.action];
            if (!action) throw new Error(`[ai] ${entry.module}: bilinmeyen eylem ${proposal.action}`); // i18n-ignore (geliştirici hatası)
            proposals.push({ kind: "module", module: entry.module, action: proposal.action, operation: action.operation, title: proposal.title, details: proposal.details ?? [], payload: proposal.payload });
          },
        }),
    }),
  ),
);

const TOOLS = [...AI_TOOLS, ...MODULE_TOOLS];

/** Bu kullanıcı için şu an kullanılabilir araçlar (modül izni + kullanıcı yetkisi). */
export async function availableTools(user: SessionUser) {
  const [usable, matrix] = await Promise.all([listUsableModuleKeys().then((keys) => new Set(keys)), getAiPermissions()]);
  // "ai" modülünün kendi araçları (ör. PDF raporu) başka modülün verisine erişmez; matristen bağımsızdır.
  return TOOLS.filter((tool) => (tool.module === "ai" || isAllowed(matrix, tool.module, tool.operation)) && usable.has(tool.module) && tool.allowed(user));
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
