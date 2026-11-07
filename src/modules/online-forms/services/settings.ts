import "server-only";

import { createHash } from "node:crypto";

import { getDb } from "@/shared/db";

export type FormTexts = { privacyText: string | null; photoText: string | null };

export async function getFormTexts(): Promise<FormTexts> {
  const row = await getDb().onlineFormSettings.findUnique({ where: { id: "default" }, select: { privacyText: true, photoText: true } });
  return { privacyText: row?.privacyText ?? null, photoText: row?.photoText ?? null };
}

export async function saveFormTexts(texts: FormTexts, actorId: string) {
  await getDb().onlineFormSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...texts, updatedById: actorId },
    update: { ...texts, updatedById: actorId },
  });
}

/** Kabul edilen metin sürümü: metinler değişince değişir (imza kanıtında saklanır). */
export function textVersion(texts: FormTexts): string {
  return createHash("sha256").update(JSON.stringify([texts.privacyText ?? "", texts.photoText ?? ""])).digest("hex");
}
