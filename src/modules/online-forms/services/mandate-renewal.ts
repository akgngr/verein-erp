import "server-only";

import { getTranslations } from "next-intl/server";

import { membersPermissions } from "@/modules/members";
import { studentsPermissions } from "@/modules/students";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import { canEncryptSecrets } from "@/shared/security/secret-box";

import { CHANNELS } from "../lib/schemas";
import { onlineFormsPermissions } from "../permissions";
import { createAndSend, previewTarget, type Actor } from "./requests";

/**
 * Narrow public contract for SEPA mandate renewal (#521). Another module (sepa) asks for a renewal link through the
 * existing e-sign flow; it never reads `online_form_requests` or contact data directly. Addresses are masked.
 */
export type RenewalSubject = { kind: "MEMBER" | "GUARDIAN"; subjectId: string };
export type RenewalChannel = (typeof CHANNELS)[number];
export type RenewalStatus = { status: "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED"; sentAt: string; completedAt: string | null };

/** Same rule as the online-forms UI: create a form link and update the source record. */
export function canRequestRenewal(role: Role, kind: RenewalSubject["kind"]): boolean {
  if (!can(role, onlineFormsPermissions, "create")) return false;
  return kind === "MEMBER" ? can(role, membersPermissions, "update") : can(role, studentsPermissions, "update");
}

/** Masked channels and the latest form request per subject (status only). */
export async function describeRenewal(subjects: RenewalSubject[]): Promise<Map<string, { channels: Partial<Record<RenewalChannel, string>>; last: RenewalStatus | null }>> {
  const unique = [...new Map(subjects.map((item) => [`${item.kind}:${item.subjectId}`, item])).values()].slice(0, 200);
  if (!unique.length) return new Map();
  const latest = await getDb().onlineFormRequest.findMany({
    where: { OR: unique.map((item) => ({ kind: item.kind, subjectId: item.subjectId })) },
    orderBy: { createdAt: "desc" },
    select: { kind: true, subjectId: true, status: true, createdAt: true, completedAt: true, expiresAt: true },
    take: 1000,
  });
  const now = new Date();
  const result = new Map<string, { channels: Partial<Record<RenewalChannel, string>>; last: RenewalStatus | null }>();
  for (const item of unique) {
    const key = `${item.kind}:${item.subjectId}`;
    const preview = await previewTarget(item.kind, item.subjectId);
    const channels: Partial<Record<RenewalChannel, string>> = {};
    for (const channel of CHANNELS) {
      const address = preview?.addresses[channel];
      if (address) channels[channel] = address;
    }
    const row = latest.find((entry) => entry.kind === item.kind && entry.subjectId === item.subjectId);
    const status = row ? (row.status === "PENDING" && row.expiresAt < now ? "EXPIRED" : row.status) : null;
    result.set(key, { channels, last: row && status ? { status, sentAt: row.createdAt.toISOString().slice(0, 10), completedAt: row.completedAt?.toISOString().slice(0, 10) ?? null } : null });
  }
  return result;
}

/** Sends an e-sign link for the subject's form (the signed form renews the SEPA mandate). */
export async function requestMandateRenewal(subject: RenewalSubject, channel: RenewalChannel, actor: Actor, origin: string) {
  if (!canEncryptSecrets()) return { ok: false as const, error: "noEncryption" as const };
  const t = await getTranslations("online-forms.message");
  return createAndSend({ kind: subject.kind, subjectId: subject.subjectId, channel }, actor, origin, (org, name) => ({
    subject: t("subject", { org }),
    text: (link, until) => t("text", { org, name, link, until }),
  }));
}
