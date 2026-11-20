import "server-only";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import type { ProposalCrypto, ProposalDeps, ProposalRow, ProposalStore } from "./proposals";

const PURPOSE = "secretary-proposal";

export const proposalCrypto: ProposalCrypto = {
  seal: (plain) => sealSecret(PURPOSE, plain),
  open: (sealed) => openSecret(PURPOSE, sealed),
};

const SELECT = {
  id: true, userId: true, source: true, itemId: true, moduleKey: true, actionKey: true, payloadEnc: true, previewEnc: true,
  payloadHash: true, preconditionsEnc: true, status: true, idempotencyKey: true, expiresAt: true, snoozedUntil: true,
} as const;

export function prismaProposalStore(): ProposalStore {
  const db = getDb();
  return {
    findByKey: (idempotencyKey) => db.secretaryProposal.findUnique({ where: { idempotencyKey }, select: SELECT }) as Promise<ProposalRow | null>,
    findOwn: (id, userId) => db.secretaryProposal.findFirst({ where: { id, userId }, select: SELECT }) as Promise<ProposalRow | null>,
    create: (data) => db.secretaryProposal.create({ data, select: { id: true } }),
    transition: async (id, userId, from, to, at) =>
      (await db.secretaryProposal.updateMany({
        where: { id, userId, status: from },
        data: {
          status: to,
          ...(to === "EXECUTING" ? { confirmedAt: at } : {}),
          ...(to === "APPLIED" || to === "FAILED" ? { completedAt: at } : {}),
        },
      })).count === 1,
    listPending: (userId, now) =>
      db.secretaryProposal.findMany({
        where: { userId, status: "PENDING", expiresAt: { gt: now }, OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] },
        select: SELECT,
        orderBy: { createdAt: "asc" },
        take: 100,
      }) as Promise<ProposalRow[]>,
    snooze: async (id, userId, until) =>
      (await db.secretaryProposal.updateMany({ where: { id, userId, status: "PENDING", expiresAt: { gt: until } }, data: { snoozedUntil: until } })).count === 1,
  };
}

/** Gerçek kayıt, modül onayı ve veritabanıyla bağımlılıklar. */
export async function defaultProposalDeps(): Promise<ProposalDeps> {
  const [{ moduleSecretaryRegistry }, { listUsableModuleKeys }] = await Promise.all([
    import("@/secretary-registry"),
    import("@/modules/system/server"),
  ]);
  return {
    store: prismaProposalStore(),
    crypto: proposalCrypto,
    registry: moduleSecretaryRegistry,
    usableModules: listUsableModuleKeys,
    onCreated: async (proposalId, userId) => {
      const { notify } = await import("@/modules/notifications/automation");
      await notify({ type: "secretary.proposal", recipients: [userId], ref: `proposal:${proposalId}`, params: {} });
    },
  };
}
