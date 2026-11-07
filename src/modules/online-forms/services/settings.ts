import "server-only";

import { createHash } from "node:crypto";

import type { OnlineFormDocumentPurpose, OnlineFormKind } from "@prisma/client";

import { getDb } from "@/shared/db";

import { sanitizeDocumentHtml } from "../lib/sanitize";

/** Online formda gösterilen belgeler (Datenschutz, fotoğraf izni, diğer). */
export type FormDocument = {
  id: string;
  title: string;
  purpose: OnlineFormDocumentPurpose;
  contentHtml: string;
  requiresConsent: boolean;
  required: boolean;
  appliesTo: OnlineFormKind[];
  sortOrder: number;
  active: boolean;
};

const select = { id: true, title: true, purpose: true, contentHtml: true, requiresConsent: true, required: true, appliesTo: true, sortOrder: true, active: true } as const;

export async function listFormDocuments(): Promise<FormDocument[]> {
  return getDb().onlineFormDocument.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select });
}

/** Belirli form türünde gösterilecek etkin belgeler; PRIVACY her zaman zorunludur ve onay kutuludur. */
export async function documentsFor(kind: OnlineFormKind): Promise<FormDocument[]> {
  const rows = await getDb().onlineFormDocument.findMany({ where: { active: true, appliesTo: { has: kind } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select });
  return rows.map((row) => ({ ...row, contentHtml: sanitizeDocumentHtml(row.contentHtml), ...(row.purpose === "PRIVACY" ? { requiresConsent: true, required: true } : {}) }));
}

export type FormDocumentInput = Omit<FormDocument, "id" | "sortOrder" | "active"> & { active: boolean };

export async function saveFormDocument(id: string | null, input: FormDocumentInput, actorId: string) {
  const data = { ...input, contentHtml: sanitizeDocumentHtml(input.contentHtml), updatedById: actorId };
  if (id) return getDb().onlineFormDocument.update({ where: { id }, data, select: { id: true } });
  const last = await getDb().onlineFormDocument.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  return getDb().onlineFormDocument.create({ data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 }, select: { id: true } });
}

export async function deleteFormDocument(id: string) {
  await getDb().onlineFormDocument.delete({ where: { id } });
}

/** Sırayı verilen kimlik listesine göre yeniden yazar. */
export async function reorderFormDocuments(ids: string[]) {
  const db = getDb();
  await db.$transaction(ids.map((id, index) => db.onlineFormDocument.update({ where: { id }, data: { sortOrder: index } })));
}

/** Gösterilen belgelerin sürümü: içerik/başlık/onay ayarı değişince değişir (imza kanıtında saklanır). */
export function textVersion(documents: FormDocument[]): string {
  return createHash("sha256").update(JSON.stringify(documents.map((doc) => [doc.id, doc.title, doc.contentHtml, doc.requiresConsent, doc.required]))).digest("hex");
}
