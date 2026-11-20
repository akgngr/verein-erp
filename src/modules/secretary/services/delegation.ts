import "server-only";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import type { Briefing } from "@/shared/secretary/define";

import { secretaryPermissions } from "../permissions";

/**
 * S5.2 (#316) — vekil/ekip modu. Kurallar:
 * - Yetkiyi yalnız sahibi (grantor) verir; kapsam ve süre sonu zorunlu; sahibi veya vekil her an geri alır.
 * - Vekil, sahibinin özetini yalnız KENDİ rolünün yetkisiyle süzülmüş ve salt okunur görür (yetki aşımı yok).
 * - Öneri/onay hiçbir zaman devredilmez: vekil görünümünde öneri yoktur; onay her zaman öneri sahibine bağlıdır.
 * - Her görüntüleme denetime yazılır.
 */
export const DELEGATION_SCOPES = ["briefing.view", "followUps.view"] as const;
export type DelegationScope = (typeof DELEGATION_SCOPES)[number];
export const DELEGATION_LIMITS = { maxDays: 90, maxActivePerGrantor: 5 } as const;

export class DelegationError extends Error {}

export const delegationInputSchema = z.object({
  delegateId: z.string().min(1).max(64),
  scopes: z.array(z.enum(DELEGATION_SCOPES)).min(1).max(DELEGATION_SCOPES.length).transform((scopes) => [...new Set(scopes)]),
  expiresAt: z.coerce.date(),
}).strict();
export type DelegationInput = z.infer<typeof delegationInputSchema>;

type UserLoader = (userId: string) => Promise<{ id: string; name: string; role: Role; isActive: boolean } | null>;

const canUse = (user: { role: Role; isActive: boolean } | null): boolean => Boolean(user?.isActive && can(user.role, secretaryPermissions, "view"));

async function defaultLoader(userId: string) {
  const { getUserById } = await import("@/modules/users/automation");
  const user = await getUserById(userId);
  return user ? { id: user.id, name: user.name, role: user.role, isActive: user.isActive } : null;
}

export async function createDelegation(grantor: { id: string; role: Role }, input: DelegationInput, now = new Date(), loadUser: UserLoader = defaultLoader) {
  if (!can(grantor.role, secretaryPermissions, "view")) throw new DelegationError("secretary.delegation.errors.forbidden");
  if (input.delegateId === grantor.id) throw new DelegationError("secretary.delegation.errors.self");
  const maxExpiry = now.getTime() + DELEGATION_LIMITS.maxDays * 86_400_000;
  if (input.expiresAt.getTime() <= now.getTime() || input.expiresAt.getTime() > maxExpiry) throw new DelegationError("secretary.delegation.errors.expiry");
  if (!canUse(await loadUser(input.delegateId))) throw new DelegationError("secretary.delegation.errors.delegateInvalid");
  const db = getDb();
  const active = { grantorId: grantor.id, revokedAt: null, expiresAt: { gt: now } };
  if (await db.secretaryDelegation.findFirst({ where: { ...active, delegateId: input.delegateId }, select: { id: true } })) throw new DelegationError("secretary.delegation.errors.duplicate");
  if ((await db.secretaryDelegation.count({ where: active })) >= DELEGATION_LIMITS.maxActivePerGrantor) throw new DelegationError("secretary.delegation.errors.limit");
  return db.secretaryDelegation.create({ data: { grantorId: grantor.id, delegateId: input.delegateId, scopes: input.scopes, expiresAt: input.expiresAt }, select: { id: true, expiresAt: true, scopes: true } });
}

/** Sahibi veya vekil geri alabilir; başkası için kayıt "yok" sayılır. */
export async function revokeDelegation(actorId: string, id: string, now = new Date()): Promise<void> {
  const result = await getDb().secretaryDelegation.updateMany({
    where: { id, revokedAt: null, OR: [{ grantorId: actorId }, { delegateId: actorId }] },
    data: { revokedAt: now, revokedById: actorId },
  });
  if (result.count !== 1) throw new DelegationError("secretary.delegation.errors.notFound");
}

export type DelegationView = { id: string; direction: "given" | "received"; otherUserId: string; otherUserName: string; scopes: DelegationScope[]; expiresAt: string; active: boolean };

export async function listDelegations(userId: string, now = new Date(), loadUser: UserLoader = defaultLoader): Promise<DelegationView[]> {
  const rows = await getDb().secretaryDelegation.findMany({
    where: { OR: [{ grantorId: userId }, { delegateId: userId }], revokedAt: null, expiresAt: { gt: new Date(now.getTime() - 30 * 86_400_000) } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Promise.all(rows.map(async (row) => {
    const given = row.grantorId === userId;
    const otherUserId = given ? row.delegateId : row.grantorId;
    return {
      id: row.id,
      direction: given ? "given" as const : "received" as const,
      otherUserId,
      otherUserName: (await loadUser(otherUserId))?.name ?? "-",
      scopes: row.scopes.filter((scope): scope is DelegationScope => (DELEGATION_SCOPES as readonly string[]).includes(scope)),
      expiresAt: row.expiresAt.toISOString(),
      active: row.expiresAt > now,
    };
  }));
}

export type DelegatedBriefingDeps = {
  loadUser?: UserLoader;
  buildBriefing: (user: { id: string; role: Role }, now: Date) => Promise<Briefing>;
};

/**
 * Vekil görünümü: yetki etkin (geri alınmamış, süresi geçmemiş, kapsamda), sahibi ve vekil etkin ve sekreter
 * yetkili olmalı. Özet sahibinin kimliğiyle ama VEKİLİN rolüyle süzülür; öneriler ve öneri kimlikleri çıkarılır.
 */
export async function getDelegatedBriefing(delegate: { id: string; role: Role }, delegationId: string, deps: DelegatedBriefingDeps, now = new Date()): Promise<{ grantorId: string; briefing: Briefing }> {
  const loadUser = deps.loadUser ?? defaultLoader;
  const grant = await getDb().secretaryDelegation.findFirst({ where: { id: delegationId, delegateId: delegate.id, revokedAt: null, expiresAt: { gt: now } } });
  if (!grant || !grant.scopes.includes("briefing.view")) throw new DelegationError("secretary.delegation.errors.notFound");
  const [grantor, current] = await Promise.all([loadUser(grant.grantorId), loadUser(delegate.id)]);
  if (!canUse(grantor) || !canUse(current)) throw new DelegationError("secretary.delegation.errors.notFound");
  const briefing = await deps.buildBriefing({ id: grant.grantorId, role: current!.role }, now);
  return {
    grantorId: grant.grantorId,
    briefing: {
      ...briefing,
      sections: briefing.sections.map((section) => ({
        ...section,
        // Salt okunur: öneri kimliği ve sunucu öneri yükü vekile gitmez.
        items: section.items.map(({ proposalId: _proposalId, suggestion: _suggestion, ...item }) => item),
      })),
    },
  };
}
