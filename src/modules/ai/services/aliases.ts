import "server-only";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { getLiveMemberLabels, membersPermissions } from "@/modules/members/automation";
import { getLiveGuardianLabels, getLiveStudentLabels, studentsPermissions } from "@/modules/students/automation";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { loadPermissionPolicy } from "@/modules/users/automation";

import { newOpaqueToken, referenceDeployment, tokenDigest, type ReferenceActor } from "./references";
import { AI_CONVERSATION_RETENTION_DAYS } from "./retention";

/**
 * Konuşma kapsamlı takma adlar (docs/architecture/ai-cloud-pseudonym-relay.md, PS3).
 * Model yalnız [[Kn]] görür; n konuşma içi sıra numarasıdır, kişiden türetilmez.
 * Eşleme AiEntityReference üzerinde (alias sütunu) tutulur; takma ad YETKİ DEĞİLDİR:
 * gösterimde her seferinde izleyicinin canlı okuma yetkisi ve kaydın varlığı denetlenir.
 */
export const ALIAS_PURPOSE = "conversation-alias";
export const ALIAS_PATTERN = /\[\[K(\d{1,6})\]\]/g;
export type AliasResource = "members" | "students" | "guardians";

const RESOURCE_MODULE: Record<AliasResource, string> = { members: "members", students: "students", guardians: "students" };
const HREF: Record<AliasResource, (id: string) => string> = {
  members: (id) => `/uyeler/${id}`,
  students: (id) => `/ogrenciler/${id}`,
  guardians: () => "/ogrenciler/veliler",
};

const formatAlias = (alias: number) => `[[K${alias}]]`;

async function findAliasScope(userId: string, conversationId: string) {
  return getDb().aiReferenceScope.findFirst({
    where: { userId, conversationId, purpose: ALIAS_PURPOSE, deploymentId: referenceDeployment(), revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

async function aliasScope(actor: ReferenceActor) {
  const existing = await findAliasScope(actor.userId, actor.conversationId);
  if (existing) return existing;
  return getDb().aiReferenceScope.create({
    data: { ...actor, purpose: ALIAS_PURPOSE, deploymentId: referenceDeployment(), expiresAt: new Date(Date.now() + AI_CONVERSATION_RETENTION_DAYS * 86_400_000) },
  });
}

/** Kayıt için konuşmanın takma adını döndürür; yoksa sıradaki numarayla oluşturur (yarışta yeniden dener). */
export async function aliasFor(actor: ReferenceActor, resource: AliasResource, recordId: string): Promise<string> {
  const scope = await aliasScope(actor);
  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.aiEntityReference.findFirst({ where: { scopeId: scope.id, resource, recordId, alias: { not: null } }, select: { alias: true } });
    if (existing?.alias) return formatAlias(existing.alias);
    const max = await db.aiEntityReference.aggregate({ where: { scopeId: scope.id }, _max: { alias: true } });
    try {
      const created = await db.aiEntityReference.create({
        data: { scopeId: scope.id, resource, recordId, alias: (max._max.alias ?? 0) + 1, tokenDigest: tokenDigest(newOpaqueToken()), expiresAt: scope.expiresAt },
        select: { alias: true },
      });
      return formatAlias(created.alias!);
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  throw new Error("AI_ALIAS_UNAVAILABLE");
}

/** Model tarafında kullanım: takma adı kayda çevirir (yalnız aynı kullanıcı + konuşma + kaynak türü). */
export async function resolveAliasRecord(actor: ReferenceActor, alias: string, resource: AliasResource): Promise<string> {
  const match = /^\[\[K(\d{1,6})\]\]$/.exec(alias.trim());
  const scope = match ? await findAliasScope(actor.userId, actor.conversationId) : null;
  const row = scope && scope.policyRevision === actor.policyRevision ? await getDb().aiEntityReference.findFirst({ where: { scopeId: scope.id, alias: Number(match![1]), resource, expiresAt: { gt: new Date() } }, select: { recordId: true } }) : null;
  if (!row) throw new Error("AI_ALIAS_UNAVAILABLE");
  return row.recordId;
}

const escapeMarkdown = (value: string) => value.replace(/([\\[\]()*_`])/g, "\\$1");

/**
 * Gösterim: metindeki [[Kn]] takma adlarını izleyicinin CANLI yetkisiyle gerçek ada çevirir
 * (markdown bağlantısı). Yetki yoksa, kayıt silindiyse veya takma ad bilinmiyorsa yer tutucu metin.
 * İzleyici konuşmanın sahibidir; başka kullanıcının kapsamı hiçbir zaman okunmaz.
 */
export async function resolveAliasesForDisplay(
  viewer: { id: string; role: Role },
  conversationId: string,
  texts: string[],
  labels: { hidden: string; unknown: string },
): Promise<string[]> {
  const wanted = new Set<number>();
  for (const text of texts) for (const match of text.matchAll(ALIAS_PATTERN)) wanted.add(Number(match[1]));
  if (!wanted.size) return texts;

  const scope = await findAliasScope(viewer.id, conversationId);
  const refs = scope ? await getDb().aiEntityReference.findMany({ where: { scopeId: scope.id, alias: { in: [...wanted] } }, select: { alias: true, resource: true, recordId: true } }) : [];
  const [policy, modules] = await Promise.all([loadPermissionPolicy(true), listUsableModuleKeys()]);
  const readable = (resource: AliasResource) =>
    modules.includes(RESOURCE_MODULE[resource]) && can(viewer.role, resource === "members" ? membersPermissions : studentsPermissions, "view", policy);

  const ids = (resource: AliasResource) => refs.filter((ref) => ref.resource === resource && readable(resource)).map((ref) => ref.recordId);
  const [members, students, guardians] = await Promise.all([getLiveMemberLabels(ids("members")), getLiveStudentLabels(ids("students")), getLiveGuardianLabels(ids("guardians"))]);
  const names: Record<AliasResource, Map<string, string>> = { members, students, guardians };

  const display = new Map<number, string>();
  for (const ref of refs) {
    const resource = ref.resource as AliasResource;
    if (!(resource in names)) continue;
    const name = readable(resource) ? names[resource].get(ref.recordId) : undefined;
    display.set(ref.alias!, name ? `[${escapeMarkdown(name)}](${HREF[resource](ref.recordId)})` : labels.hidden);
  }
  return texts.map((text) => text.replace(ALIAS_PATTERN, (_token, number: string) => display.get(Number(number)) ?? labels.unknown));
}
