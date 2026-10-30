import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { getLocale } from "next-intl/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { aiPermissions } from "../permissions";
import { runAssistant } from "../services/assistant";
import { hasAiConsent, isAiConfigured } from "../services/consent";

const bodySchema = z.object({
  turns: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40)
    .refine((turns) => turns[turns.length - 1].role === "user"),
});

// Basit kötüye kullanım sınırı: kullanıcı başına dakikada 15 istek (süreç belleğinde).
const WINDOW_MS = 60_000;
const LIMIT = 15;
const hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > LIMIT;
}

const fail = async (key: string, status: number, code?: string) =>
  NextResponse.json({ ok: false, code, error: await translateMessage(key) }, { status });

/**
 * POST /api/ai/chat — sohbet turu. Kapılar: oturum, rol yetkisi, kullanıcının açık rızası,
 * API anahtarı, hız sınırı (modülün etkin + onaylı olması köprüde denetlenir).
 * Denetim kaydına yalnızca meta veri yazılır: kullanılan araçlar, token sayısı, maskelenen
 * değer SAYISI. Mesaj içeriği hiçbir yerde saklanmaz.
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
  if (!(await hasAiConsent(user.id))) return fail("ai.errors.consentRequired", 403, "consentRequired");
  if (!isAiConfigured()) return fail("ai.errors.notConfigured", 503, "notConfigured");
  if (rateLimited(user.id)) return fail("ai.errors.rateLimited", 429);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("ai.errors.invalidRequest", 400);

  try {
    const result = await runAssistant({ user, locale: await getLocale(), turns: parsed.data.turns });
    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name, user.email),
      action: "AI_CHAT",
      entity: "AiAssistant",
      entityId: null,
      after: { tools: result.toolsUsed, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, redactedValues: result.redactions },
    });
    return NextResponse.json({ ok: true, reply: result.reply, proposals: result.proposals });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return fail("ai.errors.rateLimited", 429);
    if (error instanceof Anthropic.AuthenticationError) return fail("ai.errors.notConfigured", 503, "notConfigured");
    if (error instanceof Anthropic.APIError) {
      console.error(`[ai] API hatası ${error.status}`);
      return fail("ai.errors.unavailable", 502);
    }
    throw error;
  }
}
