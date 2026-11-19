import "server-only";

import { randomUUID } from "node:crypto";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { secretaryPermissions } from "../permissions";
import { getBriefing } from "./briefing";
import { berlinClock } from "./schedule";
import { buildWeeklyReport, renderWeeklyReportMarkdown, weeklyReportStrings } from "./weekly-report";

/** Tek kurulum: otomasyon yürütmelerinin varsayılan kurum kimliği. */
export const REPORT_ORGANIZATION_ID = "default";
export const WEEKLY_REPORT_PURPOSE = "secretary.weekly_report";
const DEADLINE_MS = 60 * 60_000;

export class WeeklyReportError extends Error {}

/**
 * Kullanıcı isteği: Files hattına (FileGeneration + mevcut Automation kuyruğu) PDF üretimi kaydeder.
 * Aynı kullanıcı aynı saat içinde tekrar isterse aynı üretim döner (idempotent). Doğrudan indirme yok.
 */
export async function requestWeeklyReport(user: { id: string; role: Role }, now = new Date()): Promise<{ generationId: string }> {
  if (!can(user.role, secretaryPermissions, "view")) throw new WeeklyReportError("secretary.weeklyReport.errors.forbidden");
  const { prepareGenerationRequest, requestGeneration } = await import("@/modules/exports/automation");
  const { weeklyReportTask } = await import("../automation");
  const prepared = await prepareGenerationRequest({
    id: `wr-${randomUUID()}`,
    organizationId: REPORT_ORGANIZATION_ID,
    ownerId: user.id,
    sourceModule: "secretary",
    purpose: WEEKLY_REPORT_PURPOSE,
    format: "pdf",
    idempotencyKey: `weekly-report:${berlinClock(now).date}:${now.getUTCHours()}`,
    deadlineAt: new Date(now.getTime() + DEADLINE_MS),
    task: weeklyReportTask,
  });
  const generation = await requestGeneration(prepared);
  return { generationId: generation.id };
}

export type WeeklyReportContext = { executionId: string; organizationId: string; leaseToken?: number; locale: "tr" | "de"; signal: AbortSignal };

/** Worker: yetkiyi yeniden denetler, yalnız sayılardan PDF üretir, aynı işlemde yayınlar. */
export async function runWeeklyReport(generationId: string, context: WeeklyReportContext): Promise<{ generationId: string; status: "READY" }> {
  const exportsApi = await import("@/modules/exports/automation");
  const db = getDb();
  const generation = await exportsApi.getSourceGeneration(generationId, "secretary", WEEKLY_REPORT_PURPOSE);
  if (!generation || generation.organizationId !== context.organizationId || generation.executionId !== context.executionId) throw new Error("SECRETARY_REPORT_EXECUTION_MISMATCH");
  if (!Number.isSafeInteger(context.leaseToken) || (context.leaseToken ?? 0) < 1) throw new Error("FILE_GENERATION_LEASE_REQUIRED");
  const lease = { id: generation.id, ownerId: generation.ownerId, organizationId: generation.organizationId, executionId: context.executionId, leaseToken: context.leaseToken! };

  const { getUserById } = await import("@/modules/users/automation");
  const authorize = async () => {
    context.signal.throwIfAborted();
    const user = await getUserById(generation.ownerId);
    if (!user?.isActive || !can(user.role, secretaryPermissions, "view")) throw new Error("SECRETARY_REPORT_FORBIDDEN");
    return { id: user.id, role: user.role };
  };
  const user = await authorize();
  const attemptId = await exportsApi.startGeneration(lease);
  const now = new Date();
  // Başlıklar kullanılmaz: çeviri anahtarı yeterli; öneri üretimi kapalı.
  const briefing = await getBriefing(user, now, { translator: async () => (key) => key, proposals: false });
  const report = buildWeeklyReport(briefing, berlinClock(now).date);
  const messages = (context.locale === "de" ? (await import("../../../../messages/de.json")).default : (await import("../../../../messages/tr.json")).default) as Record<string, { module?: { label?: string } } | undefined>;
  const { title, markdown } = renderWeeklyReportMarkdown(report, context.locale, (key) => messages[key]?.module?.label ?? key);
  const { getOrganizationProfile, getOrganizationLogoDataUri } = await import("@/modules/organization/automation");
  const fileId = await exportsApi.createPipelineDocumentFile({
    id: attemptId,
    generationId: generation.id,
    ownerId: generation.ownerId,
    title,
    markdown,
    source: "secretary",
    signal: context.signal,
    strings: weeklyReportStrings(context.locale),
    letterhead: async () => {
      const [profile, logoDataUri] = await Promise.all([getOrganizationProfile(), getOrganizationLogoDataUri()]);
      return { ...profile, logoDataUri };
    },
    beforeCommit: async () => { await authorize(); },
  });
  try {
    await db.$transaction(async (tx) => { await exportsApi.finalizeGeneration(tx, lease, fileId); });
  } catch (error) {
    await exportsApi.markGeneratedFileForDeletion(fileId, generation.ownerId);
    throw error;
  }
  return { generationId: generation.id, status: "READY" };
}

/** Başarısız deneme: yetki hatası kalıcı (FAILED), diğerleri yeniden denenebilir (QUEUED). İçerik günlüğe yazılmaz. */
export async function failWeeklyReportAttempt(generationId: string, context: WeeklyReportContext & { attempt: number }, error: unknown, maxAttempts: number): Promise<never> {
  const code = error instanceof Error && /^[A-Z][A-Z0-9_]{1,79}$/.test(error.message) ? error.message : "SECRETARY_REPORT_FAILED";
  const permanent = code === "SECRETARY_REPORT_FORBIDDEN" || code === "SECRETARY_REPORT_EXECUTION_MISMATCH" || context.attempt >= maxAttempts;
  if (context.leaseToken) {
    const { getSourceGeneration, recordGenerationAttempt } = await import("@/modules/exports/automation");
    const generation = await getSourceGeneration(generationId, "secretary", WEEKLY_REPORT_PURPOSE);
    if (generation) {
      await recordGenerationAttempt({ id: generationId, ownerId: generation.ownerId, organizationId: generation.organizationId, executionId: context.executionId, leaseToken: context.leaseToken }, permanent ? "FAILED" : "QUEUED", code).catch(() => undefined);
    }
  }
  const { PermanentTaskError } = await import("@/shared/automation/define");
  throw permanent ? new PermanentTaskError(code) : new Error(code);
}

/** Durum projeksiyonu (yalnız sahibi): dosya kimliği hazırsa; indirme Files modülünün yetkili yolundan. */
export async function getWeeklyReportState(userId: string, generationId: string) {
  const { getGenerationState } = await import("@/modules/exports/automation");
  const row = await getGenerationState(generationId, userId, REPORT_ORGANIZATION_ID);
  if (!row || row.sourceModule !== "secretary" || row.purpose !== WEEKLY_REPORT_PURPOSE) return null;
  return { id: row.id, status: row.status, errorCode: row.errorCode, fileId: row.status === "READY" ? row.fileId : null };
}
