import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { SessionUser } from "@/modules/auth";

import { loadKnownIdentifiers } from "./known-identifiers";
import { PseudonymVault } from "./privacy";
import { availableTools, runTool, toApiTool, type AssistantProposal } from "./tools";

const MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 6;

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type AssistantResult = {
  reply: string;
  proposals: AssistantProposal[];
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
    "You cannot change data. To create a task, call propose_task; the user confirms it in the panel. For reports, call get_report_link and give the link as a markdown link.",
    "If a needed tool is not available, say that the administrator has not granted the assistant access to that module.",
    "Be concise. Use short markdown lists or tables for figures.",
  ].join("\n");
}

/**
 * Sohbet turu: kullanıcı mesajları maskelenir, model araçları çağırır (kullanıcı yetkisiyle),
 * araç çıktıları da maskelenerek modele gider; yanıt kullanıcıya dönerken yer tutucular çözülür.
 * Sunucu sohbeti saklamaz (geçmiş istemcide tutulur, her istekte yeniden gönderilir).
 */
export async function runAssistant(args: { user: SessionUser; locale: string; turns: ChatTurn[] }): Promise<AssistantResult> {
  const client = new Anthropic();
  const vault = new PseudonymVault(await loadKnownIdentifiers());
  const tools = await availableTools(args.user);
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const proposals: AssistantProposal[] = [];
  const toolsUsed: string[] = [];
  const usage = { inputTokens: 0, outputTokens: 0 };

  const messages: Anthropic.Beta.BetaMessageParam[] = args.turns.map((turn) => ({ role: turn.role, content: vault.redact(turn.content) }));
  const today = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: systemPrompt(args.locale, today),
      tools: tools.map(toApiTool),
      messages,
    });
    usage.inputTokens += response.usage.input_tokens;
    usage.outputTokens += response.usage.output_tokens;

    if (response.stop_reason === "refusal") {
      return { reply: args.locale === "de" ? "Diese Anfrage kann ich nicht beantworten." : "Bu isteğe yanıt veremiyorum.", proposals, toolsUsed, usage, redactions: vault.size };
    }

    messages.push({ role: "assistant", content: response.content });
    const toolUses = response.content.filter((block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use");

    if (response.stop_reason !== "tool_use" || toolUses.length === 0 || round === MAX_TOOL_ROUNDS) {
      const text = response.content
        .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      return { reply: vault.restore(text), proposals: proposals.map((proposal) => restoreProposal(proposal, vault)), toolsUsed, usage, redactions: vault.size };
    }

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of toolUses) {
      const tool = byName.get(block.name);
      toolsUsed.push(block.name);
      if (!tool) {
        results.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "TOOL_NOT_AVAILABLE" });
        continue;
      }
      const outcome = await runTool(tool, block.input, { user: args.user, proposals });
      results.push(
        outcome.ok
          ? { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(vault.redactValue(outcome.value)) }
          : { type: "tool_result", tool_use_id: block.id, is_error: true, content: outcome.error },
      );
    }
    messages.push({ role: "user", content: results });
  }
  return { reply: "", proposals, toolsUsed, usage, redactions: vault.size };
}

function restoreProposal(proposal: AssistantProposal, vault: PseudonymVault): AssistantProposal {
  return { ...proposal, title: vault.restore(proposal.title), description: proposal.description ? vault.restore(proposal.description) : null };
}
