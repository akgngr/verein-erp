import "server-only";

import { readFile } from "node:fs/promises";

import { getDb } from "@/shared/db";
import { makeStoredName, removeFile, resolveSafePath, saveFile } from "@/shared/files";

/**
 * Dernek logosu servisi (kullanıcı isteği): PDF antetinde (Letterhead) ve
 * profil sayfasında kullanılır.
 *
 * KARAR: Dosya UPLOAD_DIR/organization/ altında uuid adla saklanır (shared/files
 * kalıbı — kullanıcı dosya adı yola girmez); veritabanında yalnızca göreli yol
 * + MIME + orijinal ad + logoUpdatedAt tutulur. Yeni logo yüklendiğinde eski
 * disk dosyası silinir (logo tekil varlıktır, geçmiş tutulmaz).
 * PNG/JPG dışı türler validateUpload + magic byte ile zaten reddedilir.
 */

/** Logo izinli uzantılar — react-pdf Image yalnızca PNG/JPEG çizebilir. */
export const LOGO_ALLOWED_EXTENSIONS: readonly string[] = ["png", "jpg", "jpeg"];
/** Logo dosya sınırı: 2 MB (antet için fazlasıyla yeterli). */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const LOGO_DIR = "organization";

/** Yeni logo için depolama yolu üretir: organization/<uuid>.<ext> */
export function buildLogoStoragePath(extension: string): string {
  return `${LOGO_DIR}/${makeStoredName(extension)}`;
}

/** Logo dosyasını diske yazar. */
export async function saveLogoFile(relativePath: string, data: Uint8Array): Promise<void> {
  await saveFile(relativePath, data);
}

/** Logo dosyasını diskten siler (best-effort — removeFile zaten sessizdir). */
export async function deleteLogoFile(relativePath: string): Promise<void> {
  await removeFile(relativePath);
}

/**
 * Logo dosyasını data URI olarak okur (react-pdf Image src'si). Logo yoksa
 * ya da dosya diskten silinmişse (kendi kendini onaran okuma) null döner.
 */
export async function getOrganizationLogoDataUri(): Promise<string | null> {
  const db = getDb();
  const row = await db.organizationProfile.findUnique({
    where: { id: "singleton" },
    select: { logoPath: true, logoMime: true },
  });
  if (!row?.logoPath || !row.logoMime) return null;

  try {
    const buffer = await readFile(resolveSafePath(row.logoPath));
    return `data:${row.logoMime};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("[organization/logo] Logo dosyası okunamadı:", error);
    return null;
  }
}
