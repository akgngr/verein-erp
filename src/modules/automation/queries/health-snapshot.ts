import "server-only";

import { getDb } from "@/shared/db";

/**
 * #583: Modül sağlık kokpiti için kaynak modül başına başarısız ve çalışan yürütmeler. Önceden
 * `system/services/readiness.ts` var olmayan `"AutomationExecution"` tablosunu ham SQL ile sorgulayıp hatayı
 * yutuyordu (her zaman 0 başarısız, worker "boşta"). Girdi/sonuç verisi döndürülmez; yalnız durum ve kod.
 */
export type AutomationModuleHealth = {
  failed: Record<string, Array<{ code: string | null }>>;
  running: Record<string, { lastHeartbeatAt: string | null; activeCount: number; isStale: boolean }>;
};

export async function getAutomationHealthByModule(options: { now?: Date; staleAfterMs?: number; limit?: number } = {}): Promise<AutomationModuleHealth> {
  const now = options.now ?? new Date();
  const staleBefore = new Date(now.getTime() - (options.staleAfterMs ?? 5 * 60 * 1000));
  const rows = await getDb().automationExecution.findMany({
    where: { status: { in: ["FAILED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 200,
    select: { sourceModule: true, status: true, lastErrorCode: true, heartbeatAt: true, updatedAt: true },
  });
  return summarizeAutomationHealth(rows, staleBefore);
}

/** Saf özetleme (test edilebilir). */
export function summarizeAutomationHealth(
  rows: Array<{ sourceModule: string; status: string; lastErrorCode: string | null; heartbeatAt: Date | null; updatedAt: Date }>,
  staleBefore: Date,
): AutomationModuleHealth {
  const failed: AutomationModuleHealth["failed"] = {};
  const running: AutomationModuleHealth["running"] = {};
  for (const row of rows) {
    if (row.status === "FAILED") {
      (failed[row.sourceModule] ??= []).push({ code: row.lastErrorCode });
      continue;
    }
    if (row.status !== "RUNNING") continue;
    const entry = (running[row.sourceModule] ??= { lastHeartbeatAt: null, activeCount: 0, isStale: false });
    entry.activeCount += 1;
    const beat = row.heartbeatAt ?? row.updatedAt;
    if (!entry.lastHeartbeatAt || beat.getTime() > new Date(entry.lastHeartbeatAt).getTime()) entry.lastHeartbeatAt = beat.toISOString();
    if (beat.getTime() < staleBefore.getTime()) entry.isStale = true;
  }
  return { failed, running };
}
