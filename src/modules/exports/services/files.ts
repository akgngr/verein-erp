import "server-only";

import { readFile } from "node:fs/promises";

import { getTranslations } from "next-intl/server";

import { getDb } from "@/shared/db";
import { removeFile, resolveSafePath, saveFile } from "@/shared/files/storage";
import { openBytes, openSecret, sealBytes, sealSecret } from "@/shared/security/secret-box";

import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";

import { FILES_RETENTION_DAYS } from "../constants";
import { FORMAT_PLUGINS } from "../formats";
import type { FileFormatId } from "../formats/types";

const PURPOSE = "generated-file";
const storagePath = (id: string) => `generated/${id}.bin`;

export type GeneratedFileItem = { id: string; title: string; format: FileFormatId; sizeBytes: number; source: string; createdAt: Date; expiresAt: Date; url: string };

const downloadUrl = (id: string) => `/api/exports/${id}`;

/** Süresi dolan dosyaları (kayıt + disk) siler. */
export async function purgeExpiredFiles(): Promise<number> {
  const expired = await getDb().generatedFile.findMany({ where: { expiresAt: { lt: new Date() } }, select: { id: true } });
  if (!expired.length) return 0;
  await getDb().generatedFile.deleteMany({ where: { id: { in: expired.map((row) => row.id) } } });
  await Promise.all(expired.map((row) => removeFile(storagePath(row.id))));
  return expired.length;
}

/**
 * Başlık + markdown içerikten istenen formatta dosya üretir, şifreleyip saklar.
 * `source`: "ai" veya çağıran modülün anahtarı. Dönen `url` yalnızca sahibine çalışır.
 */
export async function createGeneratedFile(args: { ownerId: string; title: string; format: FileFormatId; markdown: string; source: string }): Promise<GeneratedFileItem> {
  await purgeExpiredFiles();
  const plugin = FORMAT_PLUGINS[args.format];
  const createdAt = new Date();
  const t = await getTranslations("exports.document");
  const bytes = await plugin.render(
    { title: args.title, markdown: args.markdown, createdAt },
    {
      letterhead: async () => {
        const [profile, logoDataUri] = await Promise.all([getOrganizationProfile(), getOrganizationLogoDataUri()]);
        return { name: profile.name, street: profile.street, postalCode: profile.postalCode, city: profile.city, registerCourt: profile.registerCourt, registerNumber: profile.registerNumber, logoDataUri };
      },
      strings: { createdAt: t("createdAt"), note: args.source === "ai" ? t("aiNote") : t("note"), footer: (page, total) => t("footer", { page, total }) },
    },
  );
  const expiresAt = new Date(createdAt.getTime() + FILES_RETENTION_DAYS * 86_400_000);
  const row = await getDb().generatedFile.create({
    data: { ownerId: args.ownerId, titleEnc: sealSecret(PURPOSE, args.title), format: args.format, sizeBytes: bytes.length, source: args.source, createdAt, expiresAt },
  });
  try {
    await saveFile(storagePath(row.id), sealBytes(PURPOSE, bytes));
  } catch (error) {
    await getDb().generatedFile.delete({ where: { id: row.id } });
    throw error;
  }
  return { id: row.id, title: args.title, format: args.format, sizeBytes: bytes.length, source: args.source, createdAt, expiresAt, url: downloadUrl(row.id) };
}

export async function listGeneratedFiles(ownerId: string): Promise<GeneratedFileItem[]> {
  await purgeExpiredFiles();
  const rows = await getDb().generatedFile.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, take: 200 });
  return rows.map((row) => ({
    id: row.id,
    title: openSecret(PURPOSE, row.titleEnc) ?? "",
    format: row.format as FileFormatId,
    sizeBytes: row.sizeBytes,
    source: row.source,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    url: downloadUrl(row.id),
  }));
}

/** İndirme: yalnızca sahibi; süresi dolmuşsa null. */
export async function readGeneratedFile(ownerId: string, id: string): Promise<{ title: string; bytes: Buffer; mimeType: string; extension: string } | null> {
  const row = await getDb().generatedFile.findFirst({ where: { id, ownerId, expiresAt: { gt: new Date() } } });
  if (!row) return null;
  const plugin = FORMAT_PLUGINS[row.format as FileFormatId];
  if (!plugin) return null;
  const encrypted = await readFile(resolveSafePath(storagePath(row.id))).catch(() => null);
  const bytes = encrypted ? openBytes(PURPOSE, encrypted) : null;
  if (!bytes) return null;
  return { title: openSecret(PURPOSE, row.titleEnc) ?? "file", bytes, mimeType: plugin.mimeType, extension: plugin.extension };
}

export async function deleteGeneratedFile(ownerId: string, id: string): Promise<boolean> {
  const result = await getDb().generatedFile.deleteMany({ where: { id, ownerId } });
  if (result.count) await removeFile(storagePath(id));
  return result.count > 0;
}

/** Kullanıcı silindiğinde çağrılabilir (KVKK/DSGVO). */
export async function deleteFilesOfOwner(ownerId: string): Promise<void> {
  const rows = await getDb().generatedFile.findMany({ where: { ownerId }, select: { id: true } });
  await getDb().generatedFile.deleteMany({ where: { ownerId } });
  await Promise.all(rows.map((row) => removeFile(storagePath(row.id))));
}
