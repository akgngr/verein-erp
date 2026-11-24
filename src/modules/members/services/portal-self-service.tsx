import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { formatPdfDate, formatPdfMoney } from "@/shared/pdf/format";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";

import { ReceiptDocument, type ReceiptPdfData } from "../pdf/receipt-document";
import { RECEIPT_STRINGS } from "../pdf/strings";
import { membersPermissions } from "../permissions";

export const PORTAL_CORRECTION_FIELDS = [
  "email",
  "phone",
  "street",
  "houseNumber",
  "postalCode",
  "city",
] as const;

export type PortalCorrectionField = (typeof PORTAL_CORRECTION_FIELDS)[number];

export type PortalCorrectionProposalRow = {
  id: string;
  field: PortalCorrectionField;
  previousValue: string | null;
  proposedValue: string;
  status: string;
  reviewNote: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
};

export type PortalConsentTarget = "bulkMail" | "photo" | "sms" | "whatsapp" | "telegram";

export async function listMemberCorrectionProposalsForPortal(
  memberId: string,
): Promise<PortalCorrectionProposalRow[]> {
  const db = getDb();
  const rows = await db.memberCorrectionProposal.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      field: true,
      previousValue: true,
      proposedValue: true,
      status: true,
      reviewNote: true,
      createdAt: true,
      reviewedAt: true,
    },
  });
  return rows as PortalCorrectionProposalRow[];
}

export async function proposeMemberCorrectionForPortal(input: {
  memberId: string;
  subjectRef: string;
  field: PortalCorrectionField;
  proposedValue: string;
}): Promise<{ id: string } | null> {
  if (!PORTAL_CORRECTION_FIELDS.includes(input.field)) return null;
  const trimmed = input.proposedValue.trim();
  if (!trimmed || trimmed.length > 200) return null;
  if (input.field === "email" && !z.string().email().safeParse(trimmed).success) {
    return null;
  }

  const db = getDb();
  const member = await db.member.findFirst({
    where: { id: input.memberId, deletedAt: null },
    select: {
      id: true,
      email: true,
      phone: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
    },
  });
  if (!member) return null;

  const previousValue = member[input.field] ?? null;

  const proposal = await db.memberCorrectionProposal.create({
    data: {
      memberId: member.id,
      field: input.field,
      previousValue,
      proposedValue: trimmed,
      status: "PENDING",
      requestedByRef: input.subjectRef,
    },
    select: { id: true },
  });

  await writeAudit({
    userId: input.subjectRef,
    userLabel: "Member Portal",
    action: "PORTAL_CORRECTION_PROPOSED",
    entity: "MemberCorrectionProposal",
    entityId: proposal.id,
    after: { memberId: member.id, field: input.field, status: "PENDING" },
  });

  return proposal;
}

export async function listPendingMemberCorrectionProposals() {
  const db = getDb();
  return db.memberCorrectionProposal.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      member: {
        select: {
          id: true,
          membershipNumber: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

const REVIEW_SCHEMA = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(300).optional(),
});

export async function reviewMemberCorrectionProposalAction(
  input: unknown,
): Promise<ActionResult<{ id: string; status: "APPROVED" | "REJECTED" }>> {
  const run = createAction({
    permission: { definition: membersPermissions, action: "update" },
    schema: REVIEW_SCHEMA,
    handler: async ({ input: parsed, user }) => {
      const db = getDb();
      const proposal = await db.memberCorrectionProposal.findUnique({
        where: { id: parsed.id },
      });
      if (!proposal) throw new ActionError("common.errors.notFound");
      if (proposal.status !== "PENDING") throw new ActionError("common.errors.staleRecord");

      const now = new Date();
      const reviewerLabel = buildUserLabel(user.name, user.email);

      await db.$transaction(async (tx) => {
        await tx.memberCorrectionProposal.update({
          where: { id: proposal.id },
          data: {
            status: parsed.decision,
            reviewedById: user.id,
            reviewedByLabel: reviewerLabel,
            reviewNote: parsed.note?.trim() || null,
            reviewedAt: now,
          },
        });

        if (parsed.decision === "APPROVED") {
          const field = proposal.field as PortalCorrectionField;
          if (!PORTAL_CORRECTION_FIELDS.includes(field)) {
            throw new ActionError("common.errors.invalidInput");
          }
          await tx.member.update({
            where: { id: proposal.memberId },
            data: {
              [field]: proposal.proposedValue,
              updatedById: user.id,
              updatedByLabel: reviewerLabel,
            },
          });
        }
      });

      await writeAudit({
        userId: user.id,
        userLabel: reviewerLabel,
        action:
          parsed.decision === "APPROVED"
            ? "PORTAL_CORRECTION_APPROVED"
            : "PORTAL_CORRECTION_REJECTED",
        entity: "MemberCorrectionProposal",
        entityId: proposal.id,
        before: { status: "PENDING", field: proposal.field },
        after: { status: parsed.decision, memberId: proposal.memberId, field: proposal.field },
      });

      if (parsed.decision === "APPROVED") {
        await writeAudit({
          userId: user.id,
          userLabel: reviewerLabel,
          action: "MEMBER_UPDATED",
          entity: "Member",
          entityId: proposal.memberId,
          after: { appliedProposalId: proposal.id, field: proposal.field },
        });
      }

      return { id: proposal.id, status: parsed.decision };
    },
  });

  return run(input);
}

export async function getMemberConsentsForPortal(memberId: string) {
  const db = getDb();
  return db.member.findFirst({
    where: { id: memberId, deletedAt: null },
    select: {
      id: true,
      email: true,
      phone: true,
      bulkMailOptOut: true,
      messagingConsents: true,
      photoConsent: true,
      privacyConsentAt: true,
    },
  });
}

export async function revokeMemberConsentForPortal(input: {
  memberId: string;
  subjectRef: string;
  target: PortalConsentTarget;
}): Promise<boolean> {
  const db = getDb();
  const member = await db.member.findFirst({
    where: { id: input.memberId, deletedAt: null },
    select: {
      id: true,
      bulkMailOptOut: true,
      messagingConsents: true,
      photoConsent: true,
    },
  });
  if (!member) return false;

  if (input.target === "bulkMail") {
    await db.member.update({
      where: { id: member.id },
      data: { bulkMailOptOut: true },
    });
  } else if (input.target === "photo") {
    await db.member.update({
      where: { id: member.id },
      data: { photoConsent: false },
    });
  } else {
    const next = member.messagingConsents.filter((c) => c !== input.target);
    await db.member.update({
      where: { id: member.id },
      data: { messagingConsents: next },
    });
  }

  await writeAudit({
    userId: input.subjectRef,
    userLabel: "Member Portal",
    action: "PORTAL_CONSENT_REVOKED",
    entity: "Member",
    entityId: member.id,
    after: { target: input.target },
  });

  return true;
}

export async function grantMemberConsentForPortal(input: {
  memberId: string;
  subjectRef: string;
  target: PortalConsentTarget;
}): Promise<boolean> {
  const db = getDb();
  const member = await db.member.findFirst({
    where: { id: input.memberId, deletedAt: null },
    select: {
      id: true,
      messagingConsents: true,
    },
  });
  if (!member) return false;

  if (input.target === "bulkMail") {
    await db.member.update({
      where: { id: member.id },
      data: { bulkMailOptOut: false },
    });
  } else if (input.target === "photo") {
    await db.member.update({
      where: { id: member.id },
      data: { photoConsent: true },
    });
  } else {
    const next = Array.from(new Set([...member.messagingConsents, input.target]));
    await db.member.update({
      where: { id: member.id },
      data: { messagingConsents: next },
    });
  }

  await writeAudit({
    userId: input.subjectRef,
    userLabel: "Member Portal",
    action: "PORTAL_CONSENT_GRANTED",
    entity: "Member",
    entityId: member.id,
    after: { target: input.target },
  });

  return true;
}

export async function listMemberPaymentsForPortal(memberId: string) {
  const db = getDb();
  const rows = await db.memberPayment.findMany({
    where: { memberId, member: { deletedAt: null } },
    orderBy: [{ paidAt: "desc" }, { receiptNumber: "desc" }],
    take: 50,
    select: {
      id: true,
      receiptNumber: true,
      dueYear: true,
      amount: true,
      paidAt: true,
      voidedAt: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    receiptNumber: row.receiptNumber,
    dueYear: row.dueYear,
    amountCents: Number(row.amount.mul(100).toFixed(0)),
    paidAt: row.paidAt,
    voidedAt: row.voidedAt,
  }));
}

export async function renderMemberPaymentReceiptPdfForPortal(input: {
  memberId: string;
  paymentId: string;
  lang?: "tr" | "de";
}): Promise<{ bytes: Buffer; receiptNumber: string } | null> {
  const db = getDb();
  const payment = await db.memberPayment.findFirst({
    where: {
      id: input.paymentId,
      memberId: input.memberId,
      member: { deletedAt: null },
    },
    include: {
      member: { select: { firstName: true, lastName: true, membershipNumber: true } },
    },
  });
  if (!payment) return null;

  const lang = input.lang ?? "de";
  const strings = RECEIPT_STRINGS[lang];
  const [profile, logoDataUri] = await Promise.all([
    getOrganizationProfile(),
    getOrganizationLogoDataUri(),
  ]);

  const data: ReceiptPdfData = {
    organization: {
      name: profile.name,
      street: profile.street,
      postalCode: profile.postalCode,
      city: profile.city,
      registerCourt: profile.registerCourt,
      registerNumber: profile.registerNumber,
      taxNumber: profile.taxNumber,
      taxOffice: profile.taxOffice,
      exemptionNoticeDate: profile.exemptionNoticeDate,
      exemptionNoticePeriod: profile.exemptionNoticePeriod,
      logoDataUri,
    },
    lang,
    strings,
    receiptNumber: payment.receiptNumber,
    memberName: `${payment.member.firstName} ${payment.member.lastName}`,
    memberNumber: payment.member.membershipNumber,
    dueYear: payment.dueYear,
    amountLabel: formatPdfMoney(Number(payment.amount.mul(100).toFixed(0)), lang),
    paidAtLabel: formatPdfDate(payment.paidAt, lang),
    methodLabel: strings.methodLabels[payment.method],
    reference: payment.reference,
    voidedAtLabel: payment.voidedAt ? formatPdfDate(payment.voidedAt, lang) : null,
    voidReason: payment.voidReason,
  };

  registerSharedPdfFonts();
  const pdfBuffer = await renderToBuffer(<ReceiptDocument data={data} />);

  return {
    bytes: Buffer.from(pdfBuffer),
    receiptNumber: payment.receiptNumber,
  };
}
