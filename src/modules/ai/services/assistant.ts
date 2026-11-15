import "server-only";

import type { SessionUser } from "@/modules/auth";

import { ActionError } from "@/modules/auth/server";
import { canonicalCloudIntent } from "./cloud-policy";
import { getCloudSettings } from "./cloud-settings";
import { reserveAiUsage } from "./usage";
import { prepareProposal } from "./proposal-store";
import { providerRevision } from "./provider-revision";
import { moduleAiRegistry } from "@/ai-registry";
import type { AiProposal } from "../types";
import { requireCurrentAiAccess } from "./access";
import { loadKnownIdentifiers } from "./known-identifiers";
import { screenTurnsForCloud } from "./cloud-screening";
import { PseudonymVault } from "./privacy";
import { adapterFor, getProviderSettings, type AiProviderId } from "./providers";
import type { AiFile, AiProposalDraft as AssistantProposal } from "../types";
import { availableTools, runTool, unavailableTools } from "./tools";
import { getTranslations } from "next-intl/server";

const MAX_TOOL_ROUNDS = 6;

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type AssistantResult = {
  reply: string;
  proposals: AiProposal[];
  files: AiFile[];
  toolsUsed: string[];
  usage: { inputTokens: number; outputTokens: number };
  redactions: number;
};

function systemPrompt(locale: string, orgToday: string, blocked: string): string {
  return [
    "You are the assistant inside a German non-profit association (Verein) management system.",
    `Answer in the user's language (UI language: ${locale === "de" ? "German" : "Turkish"}). Today is ${orgToday}.`,
    "Use the provided tools for any question about the association's data; never guess numbers. Amounts are in EUR.",
    "Data protection is strict (GDPR/KVKK): tools intentionally return no personal data. Never ask the user for names, contact details, bank data or ID numbers, and never try to infer or reconstruct personal data.",
    "Text like [PERSON_1], [REF_1], [EMAIL_1], [IBAN_1], [PHONE_1] or [TAXID_1] is a placeholder for redacted personal data. Keep placeholders exactly as written; do not comment on them.",
    "You cannot change data directly. Tools named propose_* only show the user a confirmation card; say that the user must confirm it. For ready-made accounting reports call get_report_link. When the user asks for a PDF of any answer, table or summary, When the user asks for a file (PDF, Excel, Word, Markdown or CSV) of any answer, table or summary, call create_file with the format, a title and the full markdown content; the user gets a download button automatically, so never write a link, URL or file path for it. Use markdown tables for tabular figures.",
    "If the user asks for something you have no tool for, check the list of unavailable capabilities below and tell the user the EXACT reason and where it is fixed, using the module name given there. Never invent other settings or menu names. If it is not in the list either, say the assistant cannot do this yet.",
    blocked ? `Unavailable capabilities (tool – module – operation – reason – where to fix):\n${blocked}` : "All capabilities that exist are available to this user.",
    "Be concise. Use short markdown lists or tables for figures.",
  ].join("\n");
}

/**
 * Sohbet turu (sağlayıcıdan bağımsız): kullanıcı mesajları ve araç çıktıları maskelenir,
 * araçlar kullanıcının yetkisiyle çalışır, yanıt kullanıcıya dönerken yer tutucular çözülür.
 * Sohbet geçmişi sunucuda kullanıcıya özel ve şifreli saklanır.
 */
export async function runAssistant(args: { user: SessionUser; locale: string; provider: AiProviderId; conversationId: string; turns: ChatTurn[] }): Promise<AssistantResult> {
  await requireCurrentAiAccess(args.user.id, args.provider);
  if (args.provider !== "local" && (await getCloudSettings()).textMode === "OFF") throw new ActionError("ai.errors.cloudDisabled");
  const cloud = args.provider === "local" ? null : await getCloudSettings();
  // SCREENED: serbest metin taramadan geçer; INTENTS: yalnız hazır niyetler (canonical).
  const screened = cloud?.textMode === "SCREENED" ? await screenTurnsForCloud(args) : null;
  const canonical=args.provider==="local"||screened?null:canonicalCloudIntent(args.turns.at(-1)?.content ?? "",Number(new Date().toLocaleDateString("en-CA",{timeZone:"Europe/Berlin"}).slice(0,4)));
  if(args.provider!=="local"&&!canonical&&!screened)throw new ActionError("ai.errors.cloudIntentRequired");
  const vault = new PseudonymVault(args.provider === "local" ? await loadKnownIdentifiers() : {});
  const tRoot = await getTranslations();
  const tools = await availableTools(args.user, args.provider,key=>tRoot.has(key)?tRoot(key):undefined);
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const proposals: AssistantProposal[] = [];
  const files: AiFile[] = [];
  const toolsUsed: string[] = [];
  const today = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

  // Kapalı araçların gerçek sebebi (modül pasif / yönetici izni / kullanıcının rolü), modül adıyla.
  const fixWhere: Record<string, string> = {
    module: "module inactive or access not approved → Settings → Modules", // i18n-ignore (model-facing prompt)
    matrix: "assistant permission off → Settings → AI assistant → module card", // i18n-ignore (model-facing prompt)
    feature:"personal export feature flag off → deployment configuration AI_PERSONAL_EXPORT_ENABLED", // i18n-ignore (model-facing)
    privacy: "cloud processing is limited to approved numeric summaries → Settings → AI assistant → provider", // i18n-ignore (model-facing prompt)
    role: "the user's role lacks this permission → Users → Roles & permissions", // i18n-ignore (model-facing prompt)
  };
  const blocked = (await unavailableTools(args.user, args.provider))
    .map((tool) => `- ${tool.name} – ${tRoot.has(`${tool.module}.module.label`) ? tRoot(`${tool.module}.module.label`) : tool.module} – ${tool.operation} – ${fixWhere[tool.reason]}`)
    .join("\n");

  let callCount=0;
  const signal=AbortSignal.timeout(120_000);
  const revision=await providerRevision(args.provider);
  const settings = await getProviderSettings(args.provider);
  const result = await adapterFor(settings).run({
    model: settings.model ?? "",
    system: systemPrompt(args.locale, today, blocked) + (screened ? `\n${ALIAS_INSTRUCTION}` : ""),
    turns: canonical?[{role:"user",content:canonical}]:(screened ?? args.turns).map((turn) => ({ role: turn.role, content: vault.redact(turn.content) })),
    tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema as Record<string, unknown> })),
    maxToolRounds: MAX_TOOL_ROUNDS,
    signal,
    beforeRequest: async (bytes=0) => { signal.throwIfAborted(); await requireCurrentAiAccess(args.user.id,args.provider); await reserveAiUsage(args.user.id,"model",bytes,new Date(),{provider:args.provider,model:settings.model??""}); },
    executeTool: async (name, input) => {
      signal.throwIfAborted();
      if(++callCount>20) return {content:"AI_TOOL_BUDGET",isError:true};
      toolsUsed.push(name);
      const tool = byName.get(name);
      if (!tool) return { content: "TOOL_NOT_AVAILABLE", isError: true };
      const outcome = await runTool(tool, input, { user: args.user,conversationId:args.conversationId,policyRevision:revision, proposals, files, restore: (text) => vault.restore(text) }, args.provider);
      if(outcome.ok && Buffer.byteLength(JSON.stringify(outcome.value) ?? "")>65_536) return {content:"AI_OUTPUT_BYTE_LIMIT",isError:true};
      return outcome.ok ? { content: JSON.stringify(vault.redactValue(outcome.value)), isError: false } : { content: outcome.error, isError: true };
    },
  });

  const refusal = args.locale === "de" ? "Diese Anfrage kann ich nicht beantworten." : "Bu isteğe yanıt veremiyorum.";
  return {
    reply: result.refused ? refusal : vault.restore(result.text),
    // Önerilerdeki metinler kullanıcıya dönerken yer tutuculardan çözülür.
    // payload iç içe olabilir: tüm metin alanları derinlemesine çözülür.
    proposals: await Promise.all(proposals.map(async proposal => {
      const draft = restoreDeep(proposal, value => vault.restore(value));
      const action = moduleAiRegistry.find(entry => entry.module === draft.module)?.actions[draft.action];
      const parsed = action?.schema.safeParse(draft.payload);
      if (!action || !parsed?.success) throw new Error("AI_PROPOSAL_INVALID");
      const state = action.snapshot ? await action.snapshot(parsed.data) : undefined;
      return prepareProposal({userId:args.user.id,conversationId:args.conversationId,revision:await providerRevision(args.provider),draft:{...draft,payload:parsed.data},preconditions:state});
    })),
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

const ALIAS_INSTRUCTION = "People appear only as aliases like [[K3]]. Copy aliases exactly; never guess, invent or ask for real identities. The server shows real names to authorised users."; // i18n-ignore (model-facing prompt)

