import "server-only";

import type { OnlineFormKind } from "@prisma/client";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

/** Kanıt kaydı ve saklanan belge. Worker'da da çalışır (yalnız veritabanı + secret-box). */
export const SIGNATURE_PURPOSE = "online-forms-signature";
export const EVIDENCE_PURPOSE = "online-forms-evidence";
const DOCUMENT_PURPOSE = "online-forms-document";

/** PDF kanıt belgesinin içeriği (şifreli saklanır). IBAN maskelenir. */
export type EvidenceSnapshot = {
  v: 1;
  orgName: string;
  kind: OnlineFormKind;
  signerRole: string;
  subjectName: string;
  signerName: string;
  signedAt: string;
  channel: string;
  sentTo: string;
  consents: string[];
  textVersion: string;
  documentKey: string;
  evidenceHash: string;
  /** Kısa onay cümleleri; privacyLong/photoLong yalnız eski (belge öncesi) kayıtlarda bulunur. */
  texts: { privacyLong?: string | null; photoLong?: string | null; privacy: string; photo: string; sepa: string };
  /** İmza anında gösterilen belgeler (düz metin) ve onay durumu. */
  documents?: { title: string; purpose: string; text: string; requiresConsent: boolean; accepted: boolean }[];
  data: { member?: Record<string, unknown>; student?: Record<string, unknown>; guardian?: Record<string, unknown> };
};

export async function getEvidence(id: string): Promise<{ snapshot: EvidenceSnapshot; signature: string } | null> {
  const row = await getDb().onlineFormRequest.findUnique({ where: { id }, select: { evidenceEnc: true, signatureEnc: true } });
  if (!row?.evidenceEnc || !row.signatureEnc) return null;
  const json = openSecret(EVIDENCE_PURPOSE, row.evidenceEnc);
  const signature = openSecret(SIGNATURE_PURPOSE, row.signatureEnc);
  return json && signature ? { snapshot: JSON.parse(json) as EvidenceSnapshot, signature } : null;
}

/** İmzalı PDF'i saklar (şifreli). */
export async function storeDocument(id: string, pdf: Uint8Array) {
  await getDb().onlineFormRequest.update({ where: { id }, data: { documentEnc: sealSecret(DOCUMENT_PURPOSE, Buffer.from(pdf).toString("base64")) } });
}

export async function hasStoredDocument(id: string): Promise<boolean> {
  const row = await getDb().onlineFormRequest.findUnique({ where: { id }, select: { documentEnc: true } });
  return Boolean(row?.documentEnc);
}

/** Saklanan PDF (yoksa null; o zaman kanıt kaydından yeniden üretilir). */
export async function getStoredDocument(id: string): Promise<Uint8Array | null> {
  const row = await getDb().onlineFormRequest.findUnique({ where: { id }, select: { documentEnc: true } });
  const base64 = row?.documentEnc ? openSecret(DOCUMENT_PURPOSE, row.documentEnc) : null;
  return base64 ? new Uint8Array(Buffer.from(base64, "base64")) : null;
}
