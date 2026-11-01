import "server-only";

import { moduleDemoRegistry } from "@/demo-registry";
import { listUsableModuleKeys } from "@/modules/system/server";
import { getDb } from "@/shared/db";
import type { DemoRef } from "@/shared/demo/define";

export type DemoSummary = { moduleKey: string; count: number }[];

/** Modül bazında mevcut demo kayıt sayıları. */
export async function getDemoSummary(): Promise<DemoSummary> {
  const rows = await getDb().demoRecord.groupBy({ by: ["moduleKey"], _count: { _all: true } });
  return rows.map((row) => ({ moduleKey: row.moduleKey, count: row._count._all })).sort((a, b) => a.moduleKey.localeCompare(b.moduleKey));
}

let seeding = false;

/** Etkin modüllerin örnek verilerini üretir. Zaten demo veri varsa (veya üretim sürüyorsa) tekrar üretmez. */
export async function seedDemoData(user: { id: string; label: string }): Promise<{ created: DemoSummary; failed: string[] }> {
  if (seeding) return { created: [], failed: [] };
  seeding = true;
  try {
    return await seedOnce(user);
  } finally {
    seeding = false;
  }
}

async function seedOnce(user: { id: string; label: string }): Promise<{ created: DemoSummary; failed: string[] }> {
  const db = getDb();
  if ((await db.demoRecord.count()) > 0) return { created: [], failed: [] };
  const usable = new Set(await listUsableModuleKeys());
  const providers = moduleDemoRegistry.filter((p) => usable.has(p.moduleKey)).sort((a, b) => a.order - b.order);
  const created_: Record<string, DemoRef[]> = {};
  const created: DemoSummary = [];
  const failed: string[] = [];
  for (const provider of providers) {
    const refs: DemoRef[] = [];
    try {
      await provider.seed({ userId: user.id, userLabel: user.label, created: created_, refs });
    } catch (err) {
      // Yarıda kalan üretimin kayıtları da takibe alınır (aşağıda) ki temizlenebilsin.
      console.error(`[demo] seed failed for ${provider.moduleKey}:`, err);
      failed.push(provider.moduleKey);
    }
    created_[provider.moduleKey] = refs;
    await db.demoRecord.createMany({ data: refs.map((r) => ({ moduleKey: provider.moduleKey, model: r.model, recordId: r.id })), skipDuplicates: true });
    created.push({ moduleKey: provider.moduleKey, count: refs.length });
  }
  return { created, failed };
}

/**
 * Tüm demo kayıtlarını siler (bağımlılar önce: üretim sırasının tersi). Silinemeyen kayıtlar
 * (sonradan gerçek veriye bağlanmışsa) listede kalır ve sayısı döndürülür.
 */
export async function clearDemoData(): Promise<{ removed: number; remaining: number }> {
  const db = getDb();
  const records = await db.demoRecord.findMany({ orderBy: { createdAt: "asc" } });
  if (records.length === 0) return { removed: 0, remaining: 0 };
  const providers = [...moduleDemoRegistry].sort((a, b) => b.order - a.order);
  let removed = 0;
  for (const provider of providers) {
    const own = records.filter((r) => r.moduleKey === provider.moduleKey);
    if (own.length === 0) continue;
    const refs = own.map((r) => ({ model: r.model, id: r.recordId }));
    let failed: DemoRef[] = refs;
    try {
      failed = await provider.clear(refs);
    } catch (err) {
      console.error(`[demo] clear failed for ${provider.moduleKey}:`, err);
    }
    const failedKeys = new Set(failed.map((f) => `${f.model}:${f.id}`));
    const done = own.filter((r) => !failedKeys.has(`${r.model}:${r.recordId}`));
    await db.demoRecord.deleteMany({ where: { id: { in: done.map((r) => r.id) } } });
    removed += done.length;
  }
  return { removed, remaining: await db.demoRecord.count() };
}
