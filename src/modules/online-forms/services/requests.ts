import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { OnlineFormKind } from "@prisma/client";

import { sendDirectMessage } from "@/modules/mailings/server";
import {
  applyMemberSelfService,
  getMemberSelfService,
  type MemberSelfService,
} from "@/modules/members/server";
import { getOrganizationProfile } from "@/modules/organization/server";
import {
  applyGuardianSelfService,
  applyStudentSelfService,
  getGuardianSelfService,
  getStudentSelfService,
  type GuardianSelfService,
  type StudentSelfService,
} from "@/modules/students/server";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { emitAutomationEvent } from "@/shared/automation/emit";
import { normalizePhone } from "@/shared/campaigns/channel";
import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { onlineFormCompletedEvent } from "../automation";
import { EVIDENCE_PURPOSE, SIGNATURE_PURPOSE, type EvidenceSnapshot } from "./evidence-store";
import { documentHtmlToText } from "../lib/sanitize";
import { documentsFor, textVersion } from "./settings";
import type { submitSchema } from "../lib/schemas";
import type { z } from "zod";

export type Actor = { id: string; label: string };
export const LINK_DAYS = 14;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** e-posta/telefonu maskeler (listede ve kanıtta tam adres tutulmaz). */
export function maskAddress(value: string): string {
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 1)}•••@${domain}`;
  }
  return `${value.slice(0, 3)}•••${value.slice(-2)}`;
}

type Contact = { name: string; email: string | null; phone: string | null };
type Target = { subjectName: string; signerRole: "self" | "guardian"; signerId: string | null; contact: Contact };

/** Konu kaydı ve formu kimin dolduracağı (reşit olmayan öğrenci: ödeyen veli, yoksa ilk veli). */
async function resolveTarget(kind: OnlineFormKind, subjectId: string, guardianId?: string | null): Promise<Target | null> {
  const usable = new Set(await listUsableModuleKeys());
  if (kind === "MEMBER") {
    if (!usable.has("members")) return null;
    const member = await getMemberSelfService(subjectId);
    if (!member) return null;
    const name = `${member.firstName} ${member.lastName}`.trim();
    return { subjectName: name, signerRole: "self", signerId: null, contact: { name, email: member.email, phone: member.phone } };
  }
  if (!usable.has("students")) return null;
  if (kind === "GUARDIAN") {
    const guardian = await getGuardianSelfService(subjectId);
    if (!guardian) return null;
    const name = `${guardian.firstName} ${guardian.lastName}`.trim();
    return { subjectName: name, signerRole: "self", signerId: null, contact: { name, email: guardian.email, phone: guardian.phone } };
  }
  const student = await getStudentSelfService(subjectId);
  if (!student) return null;
  const name = `${student.firstName} ${student.lastName}`.trim();
  if (!student.minor) return { subjectName: name, signerRole: "self", signerId: null, contact: { name, email: student.email, phone: student.phone } };
  const guardian = student.guardians.find((item) => item.id === guardianId) ?? student.guardians[0];
  if (!guardian) return null;
  return { subjectName: name, signerRole: "guardian", signerId: guardian.id, contact: guardian };
}

/** Gönderim penceresi için: kime ve hangi kanallardan gönderilebilir (adresler maskeli). */
export async function previewTarget(kind: OnlineFormKind, subjectId: string) {
  const target = await resolveTarget(kind, subjectId);
  if (!target) return null;
  const student = kind === "STUDENT" ? await getStudentSelfService(subjectId) : null;
  const phone = normalizePhone(target.contact.phone);
  return {
    subjectName: target.subjectName,
    signerRole: target.signerRole,
    signerName: target.contact.name,
    guardians: student?.minor ? student.guardians.map((item) => ({ id: item.id, name: item.name })) : [],
    addresses: { email: target.contact.email ? maskAddress(target.contact.email) : null, sms: phone ? maskAddress(phone) : null, whatsapp: phone ? maskAddress(phone) : null } as Record<string, string | null>,
  };
}

export type SendLabels = { subject: string; text: (link: string, until: string) => string };

/** Bağlantı oluşturur ve gönderir. Aynı kayıt için bekleyen eski bağlantılar iptal edilir. */
export async function createAndSend(
  input: { kind: OnlineFormKind; subjectId: string; channel: string; guardianId?: string | null },
  actor: Actor,
  origin: string,
  labels: (orgName: string, signerName: string) => SendLabels,
): Promise<{ ok: true; id: string } | { ok: false; error: "notFound" | "noAddress" | "sendFailed" }> {
  const target = await resolveTarget(input.kind, input.subjectId, input.guardianId);
  if (!target) return { ok: false, error: "notFound" };
  const address = input.channel === "email" ? target.contact.email : normalizePhone(target.contact.phone);
  if (!address) return { ok: false, error: "noAddress" };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_DAYS * 86_400_000);
  const db = getDb();
  await db.onlineFormRequest.updateMany({ where: { kind: input.kind, subjectId: input.subjectId, status: "PENDING" }, data: { status: "CANCELLED" } });
  const row = await db.onlineFormRequest.create({
    data: { kind: input.kind, subjectId: input.subjectId, signerRole: target.signerRole, signerId: target.signerId, tokenHash: hashToken(token), channel: input.channel, sentTo: maskAddress(address), expiresAt, createdById: actor.id, createdByLabel: actor.label },
    select: { id: true },
  });
  const org = await getOrganizationProfile();
  const text = labels(org.name, target.contact.name);
  const link = `${origin}/formular/${token}`;
  const until = expiresAt.toISOString().slice(0, 10).split("-").reverse().join(".");
  const body = text.text(link, until);
  const result = await sendDirectMessage(input.channel, {
    to: address,
    toName: target.contact.name,
    subject: text.subject,
    text: body,
    html: `<p>${escapeHtml(body).replace(/\n/g, "<br>").replace(escapeHtml(link), `<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`)}</p>`,
    reference: `online-form:${row.id}`,
  });
  if (!result.ok) {
    await db.onlineFormRequest.delete({ where: { id: row.id } });
    return { ok: false, error: "sendFailed" };
  }
  return { ok: true, id: row.id };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function cancelRequest(id: string) {
  await getDb().onlineFormRequest.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED" } });
}

/** Yönetici listesi: konu adları kaynaktan okunur. */
export async function listRequests(filter: { kind: OnlineFormKind; subjectId: string } | null = null) {
  const rows = await getDb().onlineFormRequest.findMany({ where: filter ? { OR: [{ kind: filter.kind, subjectId: filter.subjectId }, ...(filter.kind === "GUARDIAN" ? [{ signerId: filter.subjectId }] : [])] } : {}, orderBy: { createdAt: "desc" }, take: 300, select: { id: true, documentKey: true, kind: true, subjectId: true, signerRole: true, channel: true, sentTo: true, status: true, expiresAt: true, openedAt: true, completedAt: true, signerName: true, consents: true, createdByLabel: true, createdAt: true } });
  const names = new Map<string, string>();
  for (const row of rows) {
    const key = `${row.kind}:${row.subjectId}`;
    if (!names.has(key)) names.set(key, (await resolveTarget(row.kind, row.subjectId).catch(() => null))?.subjectName ?? "—");
  }
  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    status: row.status === "PENDING" && row.expiresAt.getTime() < now ? ("EXPIRED" as const) : row.status,
    subjectName: names.get(`${row.kind}:${row.subjectId}`)!,
    expiresAt: row.expiresAt.toISOString(),
    openedAt: row.openedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** İmza görseli (yalnız yetkili yönetici, kanıt incelemesi için). */
export async function getSignature(id: string): Promise<string | null> {
  const row = await getDb().onlineFormRequest.findUnique({ where: { id }, select: { signatureEnc: true } });
  return row?.signatureEnc ? openSecret(SIGNATURE_PURPOSE, row.signatureEnc) : null;
}

export type PublicForm = {
  kind: OnlineFormKind;
  signerRole: "self" | "guardian";
  orgName: string;
  expiresAt: string;
  subjectName: string;
  member: Omit<MemberSelfService, "id"> | null;
  student: Omit<StudentSelfService, "id" | "guardians" | "minor"> | null;
  guardian: Omit<GuardianSelfService, "id"> | null;
  /** Formda gösterilecek belgeler (temizlenmiş HTML). PRIVACY yoksa yerleşik kısa Datenschutz onayı kullanılır. */
  documents: { id: string; title: string; purpose: "PRIVACY" | "PHOTO" | "OTHER"; contentHtml: string; requiresConsent: boolean; required: boolean }[];
  /** Gösterilen metin sürümü; imzada aynısı gönderilmezse (metin bu arada değişti) imza reddedilir. */
  textVersion: string;
};

async function findOpen(token: string) {
  const row = await getDb().onlineFormRequest.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.status !== "PENDING" || row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Oturumsuz form sayfası: belirteç geçerliyse formu ön doldurulmuş verir ve açılma zamanını kaydeder. */
export async function loadPublicForm(token: string): Promise<PublicForm | null> {
  const row = await findOpen(token);
  if (!row) return null;
  const target = await resolveTarget(row.kind, row.subjectId, row.signerId);
  if (!target) return null;
  if (!row.openedAt) await getDb().onlineFormRequest.update({ where: { id: row.id }, data: { openedAt: new Date() } });
  const strip = <T extends { id: string }>(value: T | null) => {
    if (!value) return null;
    const { id: _id, ...rest } = value;
    return rest;
  };
  const studentRaw = row.kind === "STUDENT" ? await getStudentSelfService(row.subjectId) : null;
  const student = studentRaw ? (({ guardians: _g, minor: _m, ...rest }) => strip(rest))(studentRaw) : null;
  const guardianId = row.kind === "GUARDIAN" ? row.subjectId : row.signerId;
  const org = await getOrganizationProfile();
  const documents = await documentsFor(row.kind);
  return {
    documents: documents.map(({ id, title, purpose, contentHtml, requiresConsent, required }) => ({ id, title, purpose, contentHtml, requiresConsent, required })),
    textVersion: textVersion(documents),
    kind: row.kind,
    signerRole: row.signerRole === "guardian" ? "guardian" : "self",
    orgName: org.name,
    expiresAt: row.expiresAt.toISOString(),
    subjectName: target.subjectName,
    member: row.kind === "MEMBER" ? strip(await getMemberSelfService(row.subjectId)) : null,
    student,
    guardian: guardianId ? strip(await getGuardianSelfService(guardianId)) : null,
  };
}

/** İmzalı formu uygular: istek önce atomik olarak kapatılır (çift gönderim olmaz), sonra kayıtlar güncellenir. */
const DOC_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Okunaklı benzersiz anahtar: ES-<yıl>-<8 karakter> (karışan 0/O, 1/I yok). */
function newDocumentKey(year: number): string {
  const bytes = randomBytes(8);
  return `ES-${year}-${Array.from(bytes, (byte) => DOC_CODE_CHARS[byte % DOC_CODE_CHARS.length]).join("")}`;
}




export async function submitPublicForm(input: z.output<typeof submitSchema>, labelFor: (name: string) => string, shown: (orgName: string) => { privacy: string; photo: string; sepa: string }): Promise<string | false | "textsChanged"> {
  const row = await findOpen(input.token);
  if (!row) return false;
  const needs = { member: row.kind === "MEMBER", student: row.kind === "STUDENT", guardian: row.kind === "GUARDIAN" || row.signerRole === "guardian" };
  if ((needs.member && !input.member) || (needs.student && !input.student) || (needs.guardian && !input.guardian)) return false;

  const signedAt = new Date();
  const documents = await documentsFor(row.kind);
  const version = textVersion(documents);
  if (version !== input.textVersion) return "textsChanged";
  const accepted = new Set(input.documents);
  // Zorunlu belgeler onaylanmalı; PRIVACY belgesi yoksa yerleşik Datenschutz onayı (input.privacy) geçerlidir.
  if (documents.some((doc) => doc.requiresConsent && doc.required && !accepted.has(doc.id))) return false;
  const photoDoc = documents.find((doc) => doc.purpose === "PHOTO" && doc.requiresConsent);
  if (photoDoc) {
    if (input.member) input.member.photoConsent = accepted.has(photoDoc.id);
    if (input.student) input.student.photoConsent = accepted.has(photoDoc.id);
  }
  const consents = ["privacy"];
  const photo = input.member?.photoConsent ?? input.student?.photoConsent;
  if (photo) consents.push("photo");
  for (const doc of documents) if (doc.purpose === "OTHER" && doc.requiresConsent && accepted.has(doc.id)) consents.push(`doc:${doc.title.slice(0, 60)}`);
  if (input.guardian?.sepaMandate) consents.push("sepa");
  for (const channel of input.member?.messagingConsents ?? input.guardian?.messagingConsents ?? []) consents.push(channel);
  const applied = { member: needs.member ? input.member : undefined, student: needs.student ? input.student : undefined, guardian: needs.guardian ? input.guardian : undefined };
  const signatureHash = createHash("sha256").update(input.signature).digest("hex");
  const evidenceHash = createHash("sha256").update(JSON.stringify({ request: row.id, signedAt: signedAt.toISOString(), signerName: input.signerName, consents, textVersion: version, applied, signatureHash })).digest("hex");

  const documentKey = newDocumentKey(signedAt.getUTCFullYear());
  const target = await resolveTarget(row.kind, row.subjectId, row.signerId);
  const orgName = (await getOrganizationProfile()).name;
  const maskIban = (value: unknown) => (typeof value === "string" && value ? `•••• ${value.replace(/\s/g, "").slice(-4)}` : value);
  const snapshot: EvidenceSnapshot = {
    v: 1, orgName, kind: row.kind, signerRole: row.signerRole, subjectName: target?.subjectName ?? "—", signerName: input.signerName,
    signedAt: signedAt.toISOString(), channel: row.channel, sentTo: row.sentTo, consents, textVersion: version, documentKey, evidenceHash,
    texts: shown(orgName),
    documents: documents.map((doc) => ({ title: doc.title, purpose: doc.purpose, text: documentHtmlToText(doc.contentHtml), requiresConsent: doc.requiresConsent, accepted: !doc.requiresConsent || accepted.has(doc.id) })),
    data: { member: applied.member, student: applied.student, guardian: applied.guardian ? { ...applied.guardian, iban: maskIban(applied.guardian.iban) } : undefined },
  };
  const db = getDb();
  const claimed = await db.onlineFormRequest.updateMany({
    where: { id: row.id, status: "PENDING" },
    data: { status: "COMPLETED", completedAt: signedAt, signerName: input.signerName, signatureEnc: sealSecret(SIGNATURE_PURPOSE, input.signature), consents, textVersion: version, documentKey, evidenceHash, evidenceEnc: sealSecret(EVIDENCE_PURPOSE, JSON.stringify(snapshot)) },
  });
  if (claimed.count !== 1) return false;
  try {
    const label = labelFor(input.signerName);
    if (applied.member) await applyMemberSelfService(row.subjectId, { ...applied.member, country: applied.member.country }, signedAt, label);
    if (applied.student) await applyStudentSelfService(row.subjectId, applied.student, signedAt);
    if (applied.guardian) await applyGuardianSelfService(row.kind === "GUARDIAN" ? row.subjectId : row.signerId!, applied.guardian, signedAt);
  } catch (error) {
    await db.onlineFormRequest.update({ where: { id: row.id }, data: { status: "PENDING", completedAt: null, signerName: null, signatureEnc: null, consents: [], textVersion: null, documentKey: null, evidenceHash: null, evidenceEnc: null } });
    throw error;
  }
  await emitAutomationEvent(onlineFormCompletedEvent, { requestId: row.id, kind: row.kind });
  return row.id;
}
