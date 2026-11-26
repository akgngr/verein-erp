import "server-only";

import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";
import { writeAudit } from "@/shared/audit/write-audit";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { membersPermissions } from "../permissions";
import { translateMessage } from "@/shared/i18n/translate-message";

/**
 * DSGVO veri taşıma hakkı (Art. 15) dışa aktarması (Faz 4, 4.6):
 * GET /api/members/[id]/data-export — izin members.update. Üyenin TÜM kayıtlı
 * alanları + aidat ödemeleri (makbuz no, tarih, tutar, yöntem, referans, iptal
 * bilgisi) JSON dosyası olarak döner (mitglied-<0012>-datenauskunft.json).
 *
 * KARAR: Yumuşak silinmiş üye için dışa aktarma VERİLMEZ (spec: anonymized
 * üyelere verilmez; bu kod tabanında silme = anonymization karşılığıdır).
 * Audit'e yalnızca üye numarası yazılır (içerik yazılmaz).
 */
export async function exportMemberDataHandler(_request: Request, ctx: { id: string }) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, membersPermissions, "update")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const db = getDb();
  const member = await db.member.findFirst({
    where: { id: ctx.id },
    include: {
      payments: {
        orderBy: { paidAt: "asc" },
        select: {
          receiptNumber: true,
          dueYear: true,
          amount: true,
          method: true,
          paidAt: true,
          reference: true,
          voidedAt: true,
          voidReason: true,
        },
      },
    },
  });

  if (!member || member.deletedAt) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("members.errors.dataExportMissing") },
      { status: 404 },
    );
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    legalBasis: "DSGVO Art. 15 — Auskunftsrecht",
    member: {
      membershipNumber: member.membershipNumber,
      type: member.type,
      status: member.status,
      firstName: member.firstName,
      lastName: member.lastName,
      kimlikNo: member.kimlikNo,
      email: member.email,
      phone: member.phone,
      street: member.street,
      houseNumber: member.houseNumber,
      postalCode: member.postalCode,
      city: member.city,
      state: member.state,
      country: member.country,
      birthDate: member.birthDate ? member.birthDate.toISOString().slice(0, 10) : null,
      profession: member.profession,
      joinDate: member.joinDate.toISOString().slice(0, 10),
      exitDate: member.exitDate ? member.exitDate.toISOString().slice(0, 10) : null,
      exitReason: member.exitReason,
      cancellationReceivedAt: member.cancellationReceivedAt
        ? member.cancellationReceivedAt.toISOString().slice(0, 10)
        : null,
      notes: member.notes,
      consents: {
        bulkMailOptOut: member.bulkMailOptOut,
        messagingConsents: member.messagingConsents,
        photoConsent: member.photoConsent,
        privacyConsentAt: member.privacyConsentAt
          ? member.privacyConsentAt.toISOString().slice(0, 10)
          : null,
      },
      sepaMandate: {
        iban: member.sepaIban,
        bic: member.sepaBic,
        accountHolder: member.sepaAccountHolder,
        mandateReference: member.sepaMandateReference,
        mandateDate: member.sepaMandateDate
          ? member.sepaMandateDate.toISOString().slice(0, 10)
          : null,
      },
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    },
    payments: member.payments.map((payment) => ({
      receiptNumber: payment.receiptNumber,
      dueYear: payment.dueYear,
      amount: payment.amount.toFixed(2),
      method: payment.method,
      paidAt: payment.paidAt.toISOString().slice(0, 10),
      reference: payment.reference,
      voidedAt: payment.voidedAt ? payment.voidedAt.toISOString() : null,
      voidReason: payment.voidReason,
    })),
  };

  // DSGVO Art. 15 tam kapsamı: notlar, yıllık aidat satırları ve portal düzeltme talepleri (#578).
  const [notes, dues, correctionProposals] = await Promise.all([
    db.memberNote.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "asc" },
      select: { body: true, authorLabel: true, createdAt: true },
    }),
    db.memberDue.findMany({
      where: { memberId: member.id },
      orderBy: { year: "asc" },
      select: { year: true, amountDue: true, status: true, dueDate: true, note: true },
    }),
    db.memberCorrectionProposal.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "asc" },
      select: {
        field: true,
        previousValue: true,
        proposedValue: true,
        status: true,
        reviewNote: true,
        createdAt: true,
        reviewedAt: true,
      },
    }),
  ]);
  const fullPayload = {
    ...payload,
    dues: dues.map((due) => ({
      year: due.year,
      amountDue: due.amountDue.toFixed(2),
      status: due.status,
      dueDate: due.dueDate.toISOString().slice(0, 10),
      note: due.note,
    })),
    correctionProposals: correctionProposals.map((item) => ({
      field: item.field,
      previousValue: item.previousValue,
      proposedValue: item.proposedValue,
      status: item.status,
      reviewNote: item.reviewNote,
      createdAt: item.createdAt.toISOString(),
      reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
    })),
    notes,
  };

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "DATA_EXPORT",
    entity: "Member",
    entityId: member.id,
    after: { membershipNumber: member.membershipNumber },
  });

  const fileName = `mitglied-${member.membershipNumber}-datenauskunft.json`;
  return new Response(JSON.stringify(fullPayload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
