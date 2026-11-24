import "server-only";

import { getDb } from "@/shared/db";

import { listDonationConfirmationsForPortal } from "@/modules/donations/server";
import { sendMail } from "@/modules/mail/server";
import {
  getMemberConsentsForPortal,
  grantMemberConsentForPortal,
  listMemberCorrectionProposalsForPortal,
  listMemberPaymentsForPortal,
  proposeMemberCorrectionForPortal,
  revokeMemberConsentForPortal,
  type PortalConsentTarget,
  type PortalCorrectionField,
} from "@/modules/members/server";

import { generateOpaqueToken, hashPortalSecret } from "./auth-core";
import { signReceiptRef } from "./receipt-ref";

function parseSubjectRef(ref: string): { kind: "member" | "guardian"; id: string } | null {
  const idx = ref.indexOf(":");
  if (idx <= 0) return null;
  const kind = ref.slice(0, idx);
  const id = ref.slice(idx + 1);
  if ((kind !== "member" && kind !== "guardian") || !id) return null;
  return { kind, id };
}

export const CONSENT_TEXT_VERSION = "2026-01";
const CONSENT_CHALLENGE_TTL_MS = 24 * 60 * 60 * 1000;

export type PortalConsentItem = {
  target: PortalConsentTarget;
  active: boolean;
  textVersion: string;
  maskedAddress: string | null;
};

export type PortalReceiptItem = {
  ref: string;
  kind: "dues" | "donation";
  number: string;
  year: number;
  amountCents: number;
  date: Date;
  voided: boolean;
};

function maskAddress(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("@")) {
    const [local, domain] = trimmed.split("@");
    const visible = (local ?? "").slice(0, 2);
    return `${visible}***@${domain ?? ""}`;
  }
  if (trimmed.length <= 4) return "****";
  return `${"*".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
}

export async function listPortalConsents(subjectRef: string): Promise<PortalConsentItem[]> {
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") return [];

  const member = await getMemberConsentsForPortal(parsed.id);
  if (!member) return [];

  const maskedEmail = maskAddress(member.email);
  const maskedPhone = maskAddress(member.phone);

  return [
    {
      target: "bulkMail",
      active: !member.bulkMailOptOut,
      textVersion: CONSENT_TEXT_VERSION,
      maskedAddress: maskedEmail,
    },
    {
      target: "photo",
      active: member.photoConsent,
      textVersion: CONSENT_TEXT_VERSION,
      maskedAddress: null,
    },
    {
      target: "sms",
      active: member.messagingConsents.includes("sms"),
      textVersion: CONSENT_TEXT_VERSION,
      maskedAddress: maskedPhone,
    },
    {
      target: "whatsapp",
      active: member.messagingConsents.includes("whatsapp"),
      textVersion: CONSENT_TEXT_VERSION,
      maskedAddress: maskedPhone,
    },
    {
      target: "telegram",
      active: member.messagingConsents.includes("telegram"),
      textVersion: CONSENT_TEXT_VERSION,
      maskedAddress: maskedPhone,
    },
  ];
}

export async function listPortalReceipts(subjectRef: string): Promise<PortalReceiptItem[]> {
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") return [];

  const [dues, donations] = await Promise.all([
    listMemberPaymentsForPortal(parsed.id),
    listDonationConfirmationsForPortal(parsed.id),
  ]);

  const duesItems: PortalReceiptItem[] = dues.map((row) => ({
    ref: signReceiptRef({ kind: "dues", id: row.id, subjectRef }),
    kind: "dues",
    number: row.receiptNumber,
    year: row.dueYear,
    amountCents: row.amountCents,
    date: row.paidAt,
    voided: Boolean(row.voidedAt),
  }));

  const donationItems: PortalReceiptItem[] = donations.map((row) => ({
    ref: signReceiptRef({ kind: "donation", id: row.id, subjectRef }),
    kind: "donation",
    number: row.confirmationNumber,
    year: row.year,
    amountCents: row.amountCents,
    date: row.issuedAt,
    voided: false,
  }));

  return [...duesItems, ...donationItems].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}

export async function listPortalCorrections(subjectRef: string) {
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") return [];
  return listMemberCorrectionProposalsForPortal(parsed.id);
}

export async function submitPortalCorrection(input: {
  subjectRef: string;
  field: PortalCorrectionField;
  proposedValue: string;
}) {
  const parsed = parseSubjectRef(input.subjectRef);
  if (!parsed || parsed.kind !== "member") return null;

  return proposeMemberCorrectionForPortal({
    memberId: parsed.id,
    subjectRef: input.subjectRef,
    field: input.field,
    proposedValue: input.proposedValue,
  });
}

export async function revokePortalConsent(
  subjectRef: string,
  target: PortalConsentTarget,
): Promise<boolean> {
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") return false;

  return revokeMemberConsentForPortal({
    memberId: parsed.id,
    subjectRef,
    target,
  });
}

export async function requestPortalConsentOptIn(input: {
  subjectRef: string;
  target: PortalConsentTarget;
  origin: string;
}): Promise<{ ok: boolean }> {
  const parsed = parseSubjectRef(input.subjectRef);
  if (!parsed || parsed.kind !== "member") return { ok: false };

  const member = await getMemberConsentsForPortal(parsed.id);
  if (!member?.email) return { ok: false };

  const rawToken = generateOpaqueToken(24);
  const tokenHash = hashPortalSecret(rawToken);
  const addressMasked = maskAddress(
    input.target === "bulkMail" ? member.email : (member.phone ?? member.email),
  ) ?? "***";

  const db = getDb();
  await db.portalConsentChallenge.create({
    data: {
      subjectRef: input.subjectRef,
      channel: input.target,
      addressMasked,
      tokenHash,
      expiresAt: new Date(Date.now() + CONSENT_CHALLENGE_TTL_MS),
    },
  });

  const confirmUrl = `${input.origin}/api/member-portal/consents/confirm?token=${encodeURIComponent(rawToken)}`;
  await sendMail({
    to: member.email,
    subject: "Einwilligung bestätigen / Rıza onayı",
    text: `Bitte bestätigen Sie Ihre Einwilligung (${input.target}, Version ${CONSENT_TEXT_VERSION}):\n${confirmUrl}\n\nLütfen rıza onayınızı doğrulayın:\n${confirmUrl}`,
    context: { module: "member-portal", reference: "consent-optin" },
  });

  return { ok: true };
}

export async function confirmPortalConsentOptIn(
  rawToken: string,
  nowMs?: number,
): Promise<{ ok: true; target: PortalConsentTarget } | { ok: false }> {
  const trimmed = rawToken.trim();
  if (!trimmed) return { ok: false };

  const db = getDb();
  const tokenHash = hashPortalSecret(trimmed);
  const challenge = await db.portalConsentChallenge.findUnique({
    where: { tokenHash },
  });

  const now = nowMs ?? Date.now();
  if (!challenge || challenge.confirmedAt || challenge.expiresAt.getTime() <= now) {
    return { ok: false };
  }

  const parsed = parseSubjectRef(challenge.subjectRef);
  if (!parsed || parsed.kind !== "member") return { ok: false };

  await db.portalConsentChallenge.update({
    where: { id: challenge.id },
    data: { confirmedAt: new Date(now) },
  });

  const target = challenge.channel as PortalConsentTarget;
  const granted = await grantMemberConsentForPortal({
    memberId: parsed.id,
    subjectRef: challenge.subjectRef,
    target,
  });

  if (!granted) return { ok: false };
  return { ok: true, target };
}
