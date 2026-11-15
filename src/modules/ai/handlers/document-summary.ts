import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, UnauthorizedError, requireUser } from "@/modules/auth/server";

import { DocumentSummaryError, summarizeDocumentText } from "../services/document-summary";
import { readAiRequestBody } from "../services/request-body";
import { ProviderError } from "../services/providers";

const bodySchema = z.object({
  text: z.string().min(20).max(20_000),
  locale: z.enum(["tr", "de"]),
  categories: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
}).strict();

/** POST /api/ai/document-summary — evrak özeti ve sınıflandırma (EV-2). Metin loglanmaz; audit'e yalnız meta veri. */
export async function documentSummaryHandler(request: Request): Promise<Response> {
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
    const summary = await summarizeDocumentText({ userId: user.id, ...parsed.data });
    await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "AI_DOCUMENT_SUMMARY", entity: "AiAssistant", entityId: null, after: { processing: summary.processing, kind: summary.kind, chars: parsed.data.text.length } });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    if (error instanceof DocumentSummaryError || error instanceof ActionError) return fail(error.message, 403);
    if (error instanceof ProviderError) return fail(error.kind === "rateLimit" ? "ai.errors.rateLimited" : "ai.errors.unavailable", 502);
    if (error instanceof Error && ["AI_USAGE_LIMIT", "AI_INPUT_BUDGET"].includes(error.message)) return fail("ai.errors.rateLimited", 429);
    console.error("[ai] DOCUMENT_SUMMARY_FAILED");
    return fail("ai.errors.unavailable", 502);
  }
}
