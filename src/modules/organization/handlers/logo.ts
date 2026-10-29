import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import {
  openReadStream,
  parseSingleFileUpload,
  uploadErrorMessage, validateUpload,
  buildDownloadResponse,
} from "@/shared/files";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { organizationPermissions } from "../permissions";
import {
  LOGO_ALLOWED_EXTENSIONS,
  LOGO_MAX_BYTES,
  buildLogoStoragePath,
  deleteLogoFile,
  saveLogoFile,
} from "../services/logo";
import { translateMessage } from "@/shared/i18n/translate-message";

/**
 * Dernek logosu uçları (kullanıcı isteği). Tümü JSON/akış döner; handler'lar
 * yönlendirme yapmaz (Faz 1 kalıbı).
 *
 *  - GET    /api/organization/logo → önizleme (inline, organization.view)
 *  - POST   /api/organization/logo → yükle/değiştir (organization.update)
 *  - DELETE /api/organization/logo → kaldır (organization.update)
 *
 * KARAR: POST, profil satırı yoksa ORGANIZATION_NAME fallback adıyla singleton
 * satırı oluşturur — logo, formun ilk kaydından bağımsız yüklenebilir.
 */

type Session = NonNullable<Awaited<ReturnType<typeof requireUser>>>;

async function authenticate(): Promise<
  { ok: true; user: Session } | { ok: false; response: NextResponse }
> {
  try {
    const user = await requireUser();
    return { ok: true, user };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: await translateMessage("common.errors.sessionExpired") },
          { status: 401 },
        ),
      };
    }
    throw error;
  }
}

/** Logo önizlemesi (profil sayfasındaki img buradan beslenir; ?v= cache-bust). */
export async function getOrganizationLogoHandler(): Promise<Response> {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const user = auth.user;
  if (!can(user.role, organizationPermissions, "view")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const row = await getDb().organizationProfile.findUnique({
    where: { id: "singleton" },
    select: { logoPath: true, logoMime: true, logoOriginalName: true },
  });
  if (!row?.logoPath || !row.logoMime) {
    return NextResponse.json({ ok: false, error: await translateMessage("organization.errors.logoMissing") }, { status: 404 });
  }

  try {
    return buildDownloadResponse({
      stream: openReadStream(row.logoPath),
      originalName: row.logoOriginalName ?? "logo",
      mimeType: row.logoMime,
      inline: true,
    });
  } catch (error) {
    console.error("[organization/logo] Logo okunamadı:", error);
    return NextResponse.json({ ok: false, error: await translateMessage("organization.errors.logoReadFailed") }, { status: 404 });
  }
}

/** Logo yükleme/değiştirme: doğrulama (PNG/JPG + magic byte) → disk → DB → audit. */
export async function uploadOrganizationLogoHandler(request: Request): Promise<Response> {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const user = auth.user;
  if (!can(user.role, organizationPermissions, "update")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const validation = validateUpload({
    file: {
      originalName: parsed.file.originalName,
      declaredMime: parsed.file.declaredMime,
      size: parsed.file.size,
      head: parsed.file.head,
    },
    allowedExtensions: LOGO_ALLOWED_EXTENSIONS,
    maxBytes: LOGO_MAX_BYTES,
  });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: await uploadErrorMessage(validation) }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.organizationProfile.findUnique({ where: { id: "singleton" } });
  const storagePath = buildLogoStoragePath(validation.file.extension);
  const now = new Date();

  await saveLogoFile(storagePath, parsed.file.buffer);

  try {
    const data = {
      logoPath: storagePath,
      logoMime: validation.file.mimeType,
      logoOriginalName: validation.file.originalName,
      logoUpdatedAt: now,
    };

    if (existing) {
      await db.organizationProfile.update({ where: { id: "singleton" }, data });
    } else {
      // KARAR: profil satırı yoksa fallback adla oluşturulur; form daha sonra
      // gerçek adla güncellenir (getOrganizationProfile aynı fallback'i kullanır).
      await db.organizationProfile.create({
        data: { id: "singleton", name: getEnv().ORGANIZATION_NAME, ...data },
      });
    }

    // Eski logo dosyası yalnızca yeni kayıt başarılı olduktan sonra silinir.
    if (existing?.logoPath && existing.logoPath !== storagePath) {
      await deleteLogoFile(existing.logoPath);
    }

    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name, user.email),
      action: "FILE_UPLOAD",
      entity: "OrganizationProfile",
      entityId: "singleton",
      after: {
        fileName: validation.file.originalName,
        size: validation.file.size,
        mimeType: validation.file.mimeType,
      },
    });

    return NextResponse.json({
      ok: true,
      logoVersion: String(now.getTime()),
      logoOriginalName: validation.file.originalName,
    });
  } catch (error) {
    await deleteLogoFile(storagePath);
    console.error("[organization/logo] Logo kaydı yazılamadı:", error);
    return NextResponse.json({ ok: false, error: "Logo kaydedilemedi." }, { status: 500 });
  }
}

/** Logo kaldırma: DB alanları null'a çekilir, disk dosyası silinir. */
export async function deleteOrganizationLogoHandler(): Promise<Response> {
  const auth = await authenticate();
  if (!auth.ok) return auth.response;

  const user = auth.user;
  if (!can(user.role, organizationPermissions, "update")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const db = getDb();
  const existing = await db.organizationProfile.findUnique({
    where: { id: "singleton" },
    select: { logoPath: true, logoOriginalName: true },
  });
  if (!existing?.logoPath) {
    return NextResponse.json({ ok: false, error: await translateMessage("organization.errors.logoMissing") }, { status: 404 });
  }

  await db.organizationProfile.update({
    where: { id: "singleton" },
    data: { logoPath: null, logoMime: null, logoOriginalName: null, logoUpdatedAt: null },
  });
  await deleteLogoFile(existing.logoPath);

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "FILE_DELETE",
    entity: "OrganizationProfile",
    entityId: "singleton",
    before: { fileName: existing.logoOriginalName },
    after: null,
  });

  return NextResponse.json({ ok: true });
}
