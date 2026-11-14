import "server-only";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { aiRetentionCutoff } from "./retention";

const PURPOSE = "ai-report";

/** Asistan raporunu (başlık + markdown) şifreli saklar; indirme bağlantısı için kimlik döner. */
export async function saveReport(userId: string, title: string, markdown: string): Promise<string> {
  const cutoff = aiRetentionCutoff();
  await getDb().aiReport.deleteMany({ where: { userId, createdAt: { lt: cutoff } } });
  const row = await getDb().aiReport.create({ data: { userId, titleEnc: sealSecret(PURPOSE, title), contentEnc: sealSecret(PURPOSE, markdown) } });
  return row.id;
}

/** Rapor yalnızca sahibine döner. */
export async function getReport(userId: string, id: string): Promise<{ title: string; markdown: string; createdAt: Date } | null> {
  const row = await getDb().aiReport.findFirst({ where: { id, userId, createdAt: { gt: aiRetentionCutoff() } } });
  if (!row) return null;
  return { title: openSecret(PURPOSE, row.titleEnc) ?? "", markdown: openSecret(PURPOSE, row.contentEnc) ?? "", createdAt: row.createdAt };
}
