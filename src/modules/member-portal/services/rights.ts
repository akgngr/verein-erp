import "server-only";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";

import { listSubjectAuditLogsForPortal } from "@/modules/audit/server";
import { listPublishedEventsForPortal, registerMemberForEventForPortal } from "@/modules/events/server";
import {
  createEncryptedArt15ExportForPortal,
  readEncryptedArt15ExportForPortal,
} from "@/modules/exports/server";
import {
  listPendingOnlineFormsForPortal,
  signOnlineFormForPortal,
} from "@/modules/online-forms/server";
import { hasLicensedFeature } from "@/modules/system/server";

import { getPortalMasterData } from "./master-data";
import { listPortalConsents, listPortalCorrections } from "./self-service";

export const PORTAL_BUSINESS_FEATURE = "member-portal:business";

function parseSubjectRef(ref: string): { kind: "member" | "guardian"; id: string } | null {
  const idx = ref.indexOf(":");
  if (idx <= 0) return null;
  const kind = ref.slice(0, idx);
  const id = ref.slice(idx + 1);
  if ((kind !== "member" && kind !== "guardian") || !id) return null;
  return { kind, id };
}

export async function hasPortalBusinessLicense(): Promise<boolean> {
  const [hasPortalBiz, hasBiz] = await Promise.all([
    hasLicensedFeature(PORTAL_BUSINESS_FEATURE),
    hasLicensedFeature("business"),
  ]);
  return hasPortalBiz || hasBiz;
}

export async function listPortalArt15Requests(subjectRef: string) {
  const db = getDb();
  return db.portalArt15Request.findMany({
    where: { subjectRef },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      generatedFileId: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

/** Board visibility: shows all Art. 15 requests across members. */
export async function listArt15RequestsForBoard() {
  const db = getDb();
  return db.portalArt15Request.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function requestPortalArt15Export(subjectRef: string): Promise<
  | { ok: true; id: string; expiresAt: Date }
  | { ok: false; reason: "alreadyOpen" | "notFound" }
> {
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") return { ok: false, reason: "notFound" };

  const db = getDb();
  const now = new Date();
  const existing = await db.portalArt15Request.findFirst({
    where: {
      subjectRef,
      expiresAt: { gt: now },
      status: { in: ["PENDING", "READY"] },
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, reason: "alreadyOpen" };
  }

  const [masterData, corrections, consents, processingLog] = await Promise.all([
    getPortalMasterData(subjectRef),
    listPortalCorrections(subjectRef),
    listPortalConsents(subjectRef),
    listSubjectAuditLogsForPortal({ subjectRef, memberId: parsed.id }),
  ]);
  if (!masterData) return { ok: false, reason: "notFound" };

  const { fileId, expiresAt } = await createEncryptedArt15ExportForPortal({
    ownerId: subjectRef,
    payload: {
      exportedAt: now.toISOString(),
      article: "DSGVO Art. 15",
      masterData,
      corrections,
      consents,
      processingLog,
    },
  });

  const req = await db.portalArt15Request.create({
    data: {
      subjectRef,
      memberId: parsed.id,
      status: "READY",
      generatedFileId: fileId,
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });

  await writeAudit({
    userId: subjectRef,
    userLabel: "Member Portal",
    action: "PORTAL_ART15_REQUESTED",
    entity: "PortalArt15Request",
    entityId: req.id,
    after: { memberId: parsed.id, expiresAt: expiresAt.toISOString() },
  });

  return { ok: true, id: req.id, expiresAt: req.expiresAt };
}

export async function downloadPortalArt15Export(subjectRef: string, requestId: string) {
  const db = getDb();
  const req = await db.portalArt15Request.findFirst({
    where: {
      id: requestId,
      subjectRef,
      status: "READY",
      expiresAt: { gt: new Date() },
    },
    select: { generatedFileId: true },
  });
  if (!req?.generatedFileId) return null;

  return readEncryptedArt15ExportForPortal({
    ownerId: subjectRef,
    fileId: req.generatedFileId,
  });
}

export async function listPortalProcessingLog(subjectRef: string) {
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") return [];
  return listSubjectAuditLogsForPortal({ subjectRef, memberId: parsed.id });
}

export async function listPortalBusinessFeatures(subjectRef: string) {
  const licensed = await hasPortalBusinessLicense();
  if (!licensed) {
    return { licensed: false as const, events: [], pendingForms: [] };
  }
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") {
    return { licensed: true as const, events: [], pendingForms: [] };
  }

  const [events, pendingForms] = await Promise.all([
    listPublishedEventsForPortal(parsed.id),
    listPendingOnlineFormsForPortal(parsed.id),
  ]);

  return { licensed: true as const, events, pendingForms };
}

export async function registerPortalEvent(subjectRef: string, eventId: string) {
  if (!(await hasPortalBusinessLicense())) {
    return { ok: false as const, reason: "licenseRequired" as const };
  }
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") {
    return { ok: false as const, reason: "notFound" as const };
  }

  const masterData = await getPortalMasterData(subjectRef);
  if (!masterData) {
    return { ok: false as const, reason: "notFound" as const };
  }

  return registerMemberForEventForPortal({
    memberId: parsed.id,
    subjectRef,
    eventId,
    firstName: masterData.firstName,
    lastName: masterData.lastName,
    email: masterData.email,
  });
}

export async function signPortalPendingForm(
  subjectRef: string,
  requestId: string,
  signerName: string,
): Promise<{ ok: true } | { ok: false; reason: "licenseRequired" | "invalidOrExpired" }> {
  if (!(await hasPortalBusinessLicense())) {
    return { ok: false, reason: "licenseRequired" };
  }
  const parsed = parseSubjectRef(subjectRef);
  if (!parsed || parsed.kind !== "member") {
    return { ok: false, reason: "invalidOrExpired" };
  }

  const signed = await signOnlineFormForPortal({
    memberId: parsed.id,
    subjectRef,
    requestId,
    signerName,
  });
  return signed ? { ok: true } : { ok: false, reason: "invalidOrExpired" };
}
