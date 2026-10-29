import "server-only";

import { NextResponse } from "next/server";

import { getMessageTranslator } from "@/shared/i18n/translate-message";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { parseSingleFileUpload } from "@/shared/files/http";
import { getExtension } from "@/shared/files/validation";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { IMPORT_MAX_FILE_MB } from "../constants";
import { membersPermissions } from "../permissions";
import { allocateMembershipNumber } from "../services/membership-number";
import { ImportParseError, parseImportWorkbook } from "../services/import-parser";
import { berlinYear, parseDateOnly } from "../utils";

/**
 * Excel üye içe aktarma (POST /api/members/import?dryRun=1|0, Faz 3 eklemeleri).
 *
 * İki adımlı: dryRun=1 yalnız doğrulama sonucu döner (yazma yok); dryRun=0
 * geçerli satırları TEK transaction'da içe aktarır, hatalı satırlar atlanır.
 * KARAR: Üye numarası içe aktarılmaz — numaralar mevcut sayaçtan, içe aktarım
 * yılına göre atanır (form akışıyla aynı; iş emrindeki global numara şeması
 * mevcut UYE-<yıl>-<sıra> yapısıyla uyumsuz olduğundan korunmadı).
 */
export async function importMembersHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, membersPermissions, "create")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") !== "0";

  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const { file } = parsed;
  if (file.size > IMPORT_MAX_FILE_MB * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: `Dosya ${IMPORT_MAX_FILE_MB} MB sınırını aşıyor.` },
      { status: 400 },
    );
  }
  if (getExtension(file.originalName) !== "xlsx") {
    return NextResponse.json(
      { ok: false, error: "Yalnızca .xlsx dosyası kabul edilir." },
      { status: 400 },
    );
  }
  // ZIP imzası (xlsx = zip paketi) — içerik türü yanıltmaya karşı.
  if (
    file.head.length < 4 ||
    file.head[0] !== 0x50 ||
    file.head[1] !== 0x4b ||
    (file.head[2] !== 0x03 && file.head[2] !== 0x05)
  ) {
    return NextResponse.json(
      { ok: false, error: "Dosya geçerli bir .xlsx paketi değil." },
      { status: 400 },
    );
  }

  let parsedFile;
  try {
    parsedFile = await parseImportWorkbook(file.buffer);
  } catch (error) {
    if (error instanceof ImportParseError) {
      const translate = await getMessageTranslator();
      return NextResponse.json({ ok: false, error: translate(error.message) }, { status: 400 });
    }
    throw error;
  }

  const db = getDb();

  // --- Mükerrer kontrolü (DB + dosya içi) --------------------------------
  const errors = [...parsedFile.errors];
  const validRows: typeof parsedFile.rows = [];

  const emails = [
    ...new Set(
      parsedFile.rows
        .map((row) => row.data.email?.toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  ];
  const dbEmails = new Set(
    emails.length
      ? (
          await db.member.findMany({
            where: { deletedAt: null, email: { in: emails } },
            select: { email: true },
          })
        )
          .map((row) => (row.email ?? "").toLowerCase())
          .filter(Boolean)
      : [],
  );

  const lastNames = [
    ...new Set(
      parsedFile.rows
        .filter((row) => row.data.birthDate)
        .map((row) => row.data.lastName),
    ),
  ];
  const dbPairs = new Set(
    lastNames.length
      ? (
          await db.member.findMany({
            where: { deletedAt: null, lastName: { in: lastNames } },
            select: { firstName: true, lastName: true, birthDate: true },
          })
        )
          .filter((row) => row.birthDate)
          .map((row) =>
            [
              row.firstName.toLowerCase(),
              row.lastName.toLowerCase(),
              row.birthDate!.toISOString().slice(0, 10),
            ].join("|"),
          )
      : [],
  );

  const fileEmails = new Set<string>();
  const filePairs = new Set<string>();

  for (const row of parsedFile.rows) {
    const rowErrors: string[] = [];
    const emailKey = row.data.email?.toLowerCase() ?? null;
    const pairKey = row.data.birthDate
      ? [
          row.data.firstName.toLowerCase(),
          row.data.lastName.toLowerCase(),
          row.data.birthDate,
        ].join("|")
      : null;

    if (emailKey && dbEmails.has(emailKey)) {
      rowErrors.push("Mükerrer kayıt: bu e-posta ile kayıtlı bir üye zaten var.");
    }
    if (emailKey && fileEmails.has(emailKey)) {
      rowErrors.push("Mükerrer kayıt: aynı e-posta dosyada birden çok kez geçiyor.");
    }
    if (pairKey && dbPairs.has(pairKey)) {
      rowErrors.push("Mükerrer kayıt: aynı ad, soyad ve doğum tarihiyle kayıtlı bir üye zaten var.");
    }
    if (pairKey && filePairs.has(pairKey)) {
      rowErrors.push("Mükerrer kayıt: aynı ad, soyad ve doğum tarihi dosyada birden çok kez geçiyor.");
    }

    if (emailKey) fileEmails.add(emailKey);
    if (pairKey) filePairs.add(pairKey);

    if (rowErrors.length > 0) {
      errors.push({ row: row.row, messages: rowErrors });
    } else {
      validRows.push(row);
    }
  }

  errors.sort((a, b) => a.row - b.row);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      total: parsedFile.total,
      valid: validRows.length,
      errors,
    });
  }

  // --- Commit: tek transaction, hatalı satırlar atlanır ------------------
  const userLabel = buildUserLabel(user.name, user.email);
  const registrationYear = berlinYear(new Date());

  const imported = await db.$transaction(async (tx) => {
    let count = 0;
    for (const row of validRows) {
      const { sequence, membershipNumber } = await allocateMembershipNumber(tx, registrationYear);
      await tx.member.create({
        data: {
          year: registrationYear,
          sequence,
          membershipNumber,
          type: row.data.type,
          status: row.data.status,
          firstName: row.data.firstName,
          lastName: row.data.lastName,
          email: row.data.email,
          phone: row.data.phone,
          street: row.data.street,
          houseNumber: row.data.houseNumber,
          postalCode: row.data.postalCode,
          city: row.data.city,
          state: row.data.state,
          country: row.data.country,
          birthDate: row.data.birthDate ? parseDateOnly(row.data.birthDate) : null,
          joinDate: parseDateOnly(row.data.joinDate)!,
          notes: row.data.notes,
          createdById: user.id,
          createdByLabel: userLabel,
        },
      });
      count += 1;
    }
    return count;
  });

  await writeAudit({
    userId: user.id,
    userLabel,
    action: "IMPORT",
    entity: "Member",
    entityId: null,
    // Gizlilik: audit'e yalnızca sayılar yazılır (kişisel veri yok).
    after: { total: parsedFile.total, valid: validRows.length, imported, registrationYear },
  });

  return NextResponse.json({
    ok: true,
    dryRun: false,
    total: parsedFile.total,
    valid: validRows.length,
    imported,
    errors,
  });
}
