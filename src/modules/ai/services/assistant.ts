import "server-only";

import type { SessionUser } from "@/modules/auth";

import { loadKnownIdentifiers } from "./known-identifiers";
import { PseudonymVault } from "./privacy";
import { adapterFor, getProviderSettings, type AiProviderId } from "./providers";
import type { AiFile, AiProposal as AssistantProposal } from "../types";
import { availableTools, runTool } from "./tools";

const MAX_TOOL_ROUNDS = 6;

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type AssistantResult = {
  reply: string;
  proposals: AssistantProposal[];
  files: AiFile[];
  toolsUsed: string[];
  usage: { inputTokens: number; outputTokens: number };
  redactions: number;
};

function systemPrompt(locale: string, orgToday: string): string {
  return [
    "You are the assistant inside a German non-profit association (Verein) management system.",
    `Answer in the user's language (UI language: ${locale === "de" ? "German" : "Turkish"}). Today is ${orgToday}.`,
    "Use the provided tools for any question about the association's data; never guess numbers. Amounts are in EUR.",
    "Data protection is strict (GDPR/KVKK): tools intentionally return no personal data. Never ask the user for names, contact details, bank data or ID numbers, and never try to infer or reconstruct personal data.",
    "Text like [PERSON_1], [REF_1], [EMAIL_1], [IBAN_1], [PHONE_1] or [TAXID_1] is a placeholder for redacted personal data. Keep placeholders exactly as written; do not comment on them.",
    "You cannot change data directly. Tools named propose_* only show the user a confirmation card; say that the user must confirm it. For ready-made accounting reports call get_report_link. When the user asks for a PDF of any answer, table or summary, When the user asks for a file (PDF, Excel, Word, Markdown or CSV) of any answer, table or summary, call create_file with the format, a title and the full markdown content; the user gets a download button automatically, so never write a link, URL or file path for it. Use markdown tables for tabular figures.",
    "If a needed tool is not available, say that the administrator has not granted the assistant this permission for that module (Settings → AI assistant).",
    "Be concise. Use short markdown lists or tables for figures.",
  ].join("\n");
}

/**
 * Sohbet turu (sağlayıcıdan bağımsız): kullanıcı mesajları ve araç çıktıları maskelenir,
 * araçlar kullanıcının yetkisiyle çalışır, yanıt kullanıcıya dönerken yer tutucular çözülür.
 * Sunucu sohbeti saklamaz (geçmiş istemcide tutulur, her istekte yeniden gönderilir).
 */
export async function runAssistant(args: { user: SessionUser; locale: string; provider: AiProviderId; turns: ChatTurn[] }): Promise<AssistantResult> {
  const vault = new PseudonymVault(await loadKnownIdentifiers());
  const tools = await availableTools(args.user);
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const proposals: AssistantProposal[] = [];
  const files: AiFile[] = [];
  const toolsUsed: string[] = [];
  const today = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

  const settings = await getProviderSettings(args.provider);
  const result = await adapterFor(settings).run({
    model: settings.model ?? "",
    system: systemPrompt(args.locale, today),
    turns: args.turns.map((turn) => ({ role: turn.role, content: vault.redact(turn.content) })),
    tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema as Record<string, unknown> })),
    maxToolRounds: MAX_TOOL_ROUNDS,
    executeTool: async (name, input) => {
      toolsUsed.push(name);
      const tool = byName.get(name);
      if (!tool) return { content: "TOOL_NOT_AVAILABLE", isError: true };
      const outcome = await runTool(tool, input, { user: args.user, proposals, files, restore: (text) => vault.restore(text) });
      return outcome.ok ? { content: JSON.stringify(vault.redactValue(outcome.value)), isError: false } : { content: outcome.error, isError: true };
    },
  });

  const refusal = args.locale === "de" ? "Diese Anfrage kann ich nicht beantworten." : "Bu isteğe yanıt veremiyorum.";
  return {
    reply: result.refused ? refusal : vault.restore(result.text),
    // Önerilerdeki metinler kullanıcıya dönerken yer tutuculardan çözülür.
    // payload iç içe olabilir: tüm metin alanları derinlemesine çözülür.
    proposals: proposals.map((proposal) => restoreDeep(proposal, (value) => vault.restore(value))),
    files: files.map((file) => ({ ...file, title: vault.restore(file.title) })),
    toolsUsed,
    usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
    redactions: vault.size,
  };
}

/** Nesne/dizi içindeki tüm metinlere `restore` uygular (önerilerin payload'ı iç içedir). */
function restoreDeep<T>(value: T, restore: (text: string) => string): T {
  if (typeof value === "string") return restore(value) as T;
  if (Array.isArray(value)) return value.map((item) => restoreDeep(item, restore)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restoreDeep(item, restore)])) as T;
  }
  return value;
}
