import "server-only";

import path from "node:path";

import { allModules } from "@/registry";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { computeSha256, removeFile, saveFile } from "@/shared/files";
import { readPackage, verifyPackage } from "@/shared/marketplace/package";
import { loadTrustedPublishers } from "@/shared/marketplace/trust";

import packageJson from "../../../../package.json";

/** Yüklenen paketi doğrular; geçerliyse dosyayı saklar. Paket içeriği ASLA sunucuda çalıştırılmaz. */
export async function uploadModulePackage(data: Buffer, actor: { id: string; label: string }) {
  const db = getDb();
  const sha256 = computeSha256(data);
  const existing = await db.systemModulePackage.findUnique({ where: { sha256 } });
  if (existing) return existing;
  let errors: string[];
  let manifest: { key: string; version: string; name: string; publisher: string; category: string } | null = null;
  try {
    const result = verifyPackage(readPackage(data), loadTrustedPublishers(), { appVersion: packageJson.version });
    errors = result.errors;
    manifest = result.manifest;
  } catch {
    errors = ["unreadable"];
  }
  const verified = errors.length === 0 && manifest !== null;
  const storagePath = verified ? ["marketplace", `${manifest!.key}-${manifest!.version}-${sha256.slice(0, 8)}.vmod`].join("/") : null;
  if (storagePath) await saveFile(storagePath, data);
  return db.systemModulePackage.create({
    data: {
      moduleKey: manifest?.key?.slice(0, 60) ?? "?",
      version: manifest?.version?.slice(0, 20) ?? "?",
      name: manifest?.name?.slice(0, 120) ?? "?",
      publisher: manifest?.publisher?.slice(0, 120) ?? "?",
      category: manifest?.category ?? "?",
      sha256,
      size: data.length,
      verified,
      errors: errors.slice(0, 20).map((error) => error.slice(0, 120)),
      storagePath,
      uploadedById: actor.id,
      uploadedByLabel: actor.label,
    },
  });
}

export async function listModulePackages() {
  const rows = await getDb().systemModulePackage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const installed = new Map(allModules.map((mod) => [mod.key, mod.version ?? "0.0.0"]));
  const uploadRoot = getEnv().UPLOAD_DIR;
  return rows.map((row) => ({
    ...row,
    installedVersion: installed.get(row.moduleKey) ?? null,
    installCommand: row.storagePath ? `pnpm module:install ${path.posix.join(uploadRoot.replace(/\\/g, "/"), row.storagePath)}` : null,
  }));
}

export async function deleteModulePackage(id: string) {
  const row = await getDb().systemModulePackage.delete({ where: { id } });
  if (row.storagePath) await removeFile(row.storagePath);
}

export function listTrustedPublishers() {
  return loadTrustedPublishers().map((entry) => ({ publisher: entry.publisher, keyId: entry.keyId, official: Boolean(entry.official) }));
}
