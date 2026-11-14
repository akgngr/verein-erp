import "server-only";

import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, UnauthorizedError, requireUser } from "@/modules/auth/server";

import { readAiRequestBody } from "../services/request-body";
import { recordAiMetric } from "../services/metrics";
import { reserveAiUsage } from "../services/usage";
import { claimAiTurn, finishAiTurn } from "../services/turns";
import { aiPermissions } from "../permissions";
import { runAssistant } from "../services/assistant";
import { getActiveProvider, hasAiConsent } from "../services/consent";
import { AI_HISTORY_WINDOW, appendTurns, createConversation, getConversation } from "../services/history";
import { ProviderError } from "../services/providers";

/** İstemci yalnızca yeni mesajı ve sohbet kimliğini gönderir; geçmiş sunucuda (şifreli) tutulur. */
const bodySchema = z.object({
  conversationId: z.string().min(1).max(64).nullable(),
  requestKey: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(4000),
});

const fail = async (key: string, status: number, code?: string) =>
  NextResponse.json({ ok: false, code, error: await translateMessage(key) }, { status });

/**
 * POST /api/ai/chat — sohbet turu. Kapılar: oturum, rol yetkisi, kullanıcının açık rızası,
 * API anahtarı, hız sınırı (modülün etkin + onaylı olması köprüde denetlenir).
 * Denetim kaydına yalnızca meta veri yazılır: kullanılan araçlar, token sayısı, maskelenen
 * değer SAYISI. Mesaj içeriği audit kaydına yazılmaz; sohbet geçmişi şifreli saklanır.
 */
export async function aiChatHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("common.errors.sessionExpired", 401);
    throw error;
  }
  if (!can(user.role, aiPermissions, "view")) return fail("common.errors.forbidden", 403);
  const provider = await getActiveProvider();
  if (!provider) return fail("ai.errors.notConfigured", 503, "notConfigured");
  // Rıza sağlayıcıya bağlıdır: yönetici sağlayıcıyı değiştirdiyse yeniden onay istenir.
  if (!(await hasAiConsent(user.id))) return fail("ai.errors.consentRequired", 403, "consentRequired");
  try { await reserveAiUsage(user.id,"request"); } catch { await recordAiMetric("usage_denied"); return fail("ai.errors.rateLimited",429); }

  const parsed = bodySchema.safeParse(await readAiRequestBody(request));
  if (!parsed.success) return fail("ai.errors.invalidRequest", 400);

  try {
    const { message } = parsed.data;
    let conversationId = parsed.data.conversationId;
    const previous = conversationId ? await getConversation(user.id, conversationId, AI_HISTORY_WINDOW) : null;
    if (conversationId && !previous) return fail("ai.errors.conversationNotFound", 404);
    const history = (previous?.turns ?? []).slice(-(AI_HISTORY_WINDOW - 1)).map(({ role, content }) => ({ role, content }));
    conversationId ??= await createConversation(user.id, message);
    const claim=await claimAiTurn(user.id,conversationId,parsed.data.requestKey ?? crypto.randomUUID());
    if(claim.cached) return NextResponse.json(claim.cached);
    try {
    const result = await runAssistant({ conversationId, user, locale: await getLocale(), provider, turns: [...history, { role: "user", content: message }] });
    await appendTurns(conversationId, [
      { role: "user", content: message },
      { role: "assistant", content: result.reply, proposals: result.proposals, files: result.files },
    ]);
    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name, user.email),
      action: "AI_CHAT",
      entity: "AiAssistant",
      entityId: null,
      after: { provider, tools: result.toolsUsed, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, redactedValues: result.redactions },
    });
    const response={ok:true,conversationId,reply:result.reply,proposals:result.proposals,files:result.files};
    await finishAiTurn(user.id,conversationId,claim.id,response,true);
    return NextResponse.json(response);
    } catch(error) { await finishAiTurn(user.id,conversationId,claim.id,null,false); throw error; }
  } catch (error) {
    await recordAiMetric(error instanceof ActionError?"request_denied":"request_failed");
    if(error instanceof Error && ["AI_TURN_BUSY","AI_USAGE_LIMIT","AI_INPUT_BUDGET"].includes(error.message)) return fail("ai.errors.rateLimited",429);
    if (error instanceof ActionError) return fail(error.message, 403);
    if (error instanceof ProviderError) {
      console.error(`[ai] Sağlayıcı hatası (${provider}): ${error.kind}`);
      if (error.kind === "rateLimit") return fail("ai.errors.rateLimited", 429);
      if (error.kind === "auth") return fail("ai.errors.providerAuth", 502, "providerAuth");
      return fail("ai.errors.unavailable", 502);
    }
    throw error;
  }
}
