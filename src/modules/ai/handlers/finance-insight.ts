import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, UnauthorizedError, requireUser } from "@/modules/auth/server";

import { FinanceInsightError, generateFinanceInsight } from "../services/finance-insight";
import { readAiRequestBody } from "../services/request-body";
import { ProviderError } from "../services/providers";

const bodySchema = z.object({
  locale: z.enum(["tr", "de"]),
  year: z.number().int().min(2000).max(2100),
}).strict();

/** POST /api/ai/insight — muhasebe durum analizi kartı. Yalnız toplam veriler; audit'e yalnız meta veri. */
export async function financeInsightHandler(request: Request): Promise<Response> {
  const fail = async (key: string, status: number) => NextResponse.json({ ok: false, error: await translateMessage(key) }, { status });
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("common.errors.sessionExpired", 401);
    throw error;
  }
  const parsed = bodySchema.safeParse(await readAiRequestBody(request));
  if (!parsed.success) return fail("ai.errors.invalidRequest", 400);
  try {
    const insight = await generateFinanceInsight({ user, ...parsed.data });
    await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "AI_FINANCE_INSIGHT", entity: "AiAssistant", entityId: null, after: { processing: insight.processing, status: insight.status, sources: insight.sources, year: parsed.data.year } });
    return NextResponse.json({ ok: true, insight });
  } catch (error) {
    if (error instanceof FinanceInsightError || error instanceof ActionError) return fail(error.message, 403);
    if (error instanceof ProviderError) return fail(error.kind === "rateLimit" ? "ai.errors.rateLimited" : "ai.errors.unavailable", 502);
    if (error instanceof Error && ["AI_USAGE_LIMIT", "AI_INPUT_BUDGET"].includes(error.message)) return fail("ai.errors.rateLimited", 429);
    console.error("[ai] FINANCE_INSIGHT_FAILED");
    return fail("ai.errors.unavailable", 502);
  }
}
