import { createHash } from "node:crypto";

import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import type { ModuleSecretary, SecretaryAction, SecretaryContext } from "@/shared/secretary/define";

import { secretaryPermissions } from "../permissions";

/**
 * T2.1 — kural kaynaklı öneriler ve onay yolu (ADR 0005). Değişmezler:
 * - payload ve önizleme şifreli; payload hash ile bütünlük denetlenir;
 * - onay atomik PENDING→EXECUTING geçişidir; belirsiz bir yazma asla otomatik tekrarlanmaz;
 * - çalıştırmadan önce modül kullanılabilirliği, sekreter ve eylem yetkisi yeniden denetlenir;
 * - kaynak değiştiyse (snapshot hash) öneri bayattır ve çalışmaz;
 * - dışa etkili (`external`) eylem açık ek onay olmadan çalışmaz; hiçbir eylem otomatik onaylanmaz.
 */

export const PROPOSAL_TTL_MS = 7 * 86_400_000;

export type ProposalStatus = "PENDING" | "EXECUTING" | "APPLIED" | "FAILED" | "DISMISSED" | "EXPIRED";

export type ProposalRow = {
  id: string;
  userId: string;
  source: string;
  itemId: string | null;
  moduleKey: string;
  actionKey: string;
  payloadEnc: string;
  previewEnc: string;
  payloadHash: string;
  preconditionsEnc: string | null;
  status: ProposalStatus;
  idempotencyKey: string;
  expiresAt: Date;
};

export type ProposalCreate = Omit<ProposalRow, "id" | "status">;

export type ProposalStore = {
  findByKey: (idempotencyKey: string) => Promise<ProposalRow | null>;
  findOwn: (id: string, userId: string) => Promise<ProposalRow | null>;
  create: (data: ProposalCreate) => Promise<{ id: string }>;
  /** Koşullu geçiş: yalnız sahibinin, `from` durumundaki satırı. true: tam bir satır değişti. */
  transition: (id: string, userId: string, from: ProposalStatus, to: ProposalStatus, at: Date) => Promise<boolean>;
  listPending: (userId: string, now: Date) => Promise<ProposalRow[]>;
};

export type ProposalCrypto = { seal: (plain: string) => string; open: (sealed: string) => string | null };

export type ProposalDeps = {
  store: ProposalStore;
  crypto: ProposalCrypto;
  registry: readonly ModuleSecretary[];
  usableModules: () => Promise<string[]>;
};

export class ProposalError extends Error {}

export const hashOf = (value: unknown) => createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");

function findAction(registry: readonly ModuleSecretary[], moduleKey: string, actionKey: string): SecretaryAction | null {
  return registry.find((entry) => entry.module === moduleKey)?.actions?.find((action) => action.key === actionKey) ?? null;
}

const allowed = (role: Role, action: SecretaryAction) =>
  can(role, secretaryPermissions, "view") && can(role, action.permission.definition, action.permission.action);

/**
 * Sağlayıcı öğesindeki öneriyi kalıcı, şifreli öneriye çevirir; aynı öğe + payload + kaynak durumu için
 * idempotenttir. Kapatılmış/uygulanmış öneri yeniden doğmaz. Dönüş: bekleyen öneri kimliği veya undefined.
 */
export async function ensureRuleProposal(
  user: { id: string; role: Role },
  input: { moduleKey: string; itemId: string; action: string; payload: unknown; context: SecretaryContext },
  deps: Omit<ProposalDeps, "usableModules">,
  now: Date,
): Promise<string | undefined> {
  const action = findAction(deps.registry, input.moduleKey, input.action);
  if (!action || !allowed(user.role, action)) return undefined;
  const parsed = action.schema.safeParse(input.payload);
  if (!parsed.success) return undefined;
  const payload = parsed.data;
  const snapshot = action.snapshot ? await action.snapshot(payload) : undefined;
  if (action.snapshot && (snapshot === null || snapshot === undefined)) return undefined;
  const payloadHash = hashOf(payload);
  const idempotencyKey = hashOf([user.id, input.itemId, input.moduleKey, input.action, payloadHash, snapshot === undefined ? null : hashOf(snapshot)]);

  const existing = await deps.store.findByKey(idempotencyKey);
  if (existing) return existing.status === "PENDING" && existing.expiresAt > now ? existing.id : undefined;

  const preview = await action.preview(payload, input.context);
  const created = await deps.store.create({
    userId: user.id,
    source: "rule",
    itemId: input.itemId,
    moduleKey: input.moduleKey,
    actionKey: input.action,
    payloadEnc: deps.crypto.seal(JSON.stringify(payload)),
    previewEnc: deps.crypto.seal(JSON.stringify({ title: preview.title.slice(0, 200), detail: preview.detail?.slice(0, 400) })),
    payloadHash,
    preconditionsEnc: snapshot === undefined ? null : deps.crypto.seal(hashOf(snapshot)),
    idempotencyKey,
    expiresAt: new Date(now.getTime() + PROPOSAL_TTL_MS),
  });
  return created.id;
}

export type ProposalView = { id: string; moduleKey: string; actionKey: string; risk: "internal" | "external"; title: string; detail?: string; expiresAt: string };

/** Onay kutusu listesi: yalnız kullanıcının, süresi dolmamış, eylemi hâlâ izinli bekleyen önerileri. */
export async function listPendingProposals(user: { id: string; role: Role }, deps: ProposalDeps, now: Date): Promise<ProposalView[]> {
  const usable = new Set(await deps.usableModules());
  const rows = await deps.store.listPending(user.id, now);
  return rows.flatMap((row) => {
    const action = findAction(deps.registry, row.moduleKey, row.actionKey);
    if (!action || !usable.has(row.moduleKey) || !allowed(user.role, action)) return [];
    const plain = deps.crypto.open(row.previewEnc);
    if (!plain) return [];
    const preview = JSON.parse(plain) as { title: string; detail?: string };
    return [{ id: row.id, moduleKey: row.moduleKey, actionKey: row.actionKey, risk: action.risk, title: preview.title, detail: preview.detail, expiresAt: row.expiresAt.toISOString() }];
  });
}

/** Öneriyi onaylar ve hedef modül eylemini çalıştırır. Hata kodları çeviri anahtarıdır. */
export async function confirmProposal(
  user: { id: string; role: Role },
  input: { id: string; confirmExternal?: boolean },
  deps: ProposalDeps,
  now: Date,
): Promise<{ status: "APPLIED"; href?: string; moduleKey: string; actionKey: string }> {
  const row = await deps.store.findOwn(input.id, user.id);
  if (!row || row.status !== "PENDING") throw new ProposalError("secretary.proposals.errors.unavailable");
  if (row.expiresAt.getTime() <= now.getTime()) {
    await deps.store.transition(row.id, user.id, "PENDING", "EXPIRED", now);
    throw new ProposalError("secretary.proposals.errors.expired");
  }

  const action = findAction(deps.registry, row.moduleKey, row.actionKey);
  const usable = new Set(await deps.usableModules());
  if (!action || !usable.has(row.moduleKey) || !allowed(user.role, action)) {
    throw new ProposalError("secretary.proposals.errors.forbidden");
  }
  if (action.risk === "external" && input.confirmExternal !== true) {
    throw new ProposalError("secretary.proposals.errors.externalConfirmRequired");
  }

  const plain = deps.crypto.open(row.payloadEnc);
  const raw: unknown = plain === null ? undefined : JSON.parse(plain);
  const parsed = action.schema.safeParse(raw);
  if (plain === null || hashOf(raw) !== row.payloadHash || !parsed.success) {
    await deps.store.transition(row.id, user.id, "PENDING", "FAILED", now);
    throw new ProposalError("secretary.proposals.errors.unreadable");
  }
  const payload = parsed.data;

  if (row.preconditionsEnc !== null) {
    const current = action.snapshot ? await action.snapshot(payload) : null;
    if (current === null || current === undefined || deps.crypto.open(row.preconditionsEnc) !== hashOf(current)) {
      await deps.store.transition(row.id, user.id, "PENDING", "EXPIRED", now);
      throw new ProposalError("secretary.proposals.errors.stale");
    }
  }

  // Atomik sahiplenme: çift tıklama veya paralel istek ikinci kez çalıştıramaz.
  if (!(await deps.store.transition(row.id, user.id, "PENDING", "EXECUTING", now))) {
    throw new ProposalError("secretary.proposals.errors.unavailable");
  }
  try {
    const result = await action.execute(payload, { user, now });
    await deps.store.transition(row.id, user.id, "EXECUTING", "APPLIED", now);
    return { status: "APPLIED", href: result.href, moduleKey: row.moduleKey, actionKey: row.actionKey };
  } catch (error) {
    // Belirsiz yazma tekrar denenmez: FAILED kalır, kullanıcı kaynağa gidip kontrol eder.
    await deps.store.transition(row.id, user.id, "EXECUTING", "FAILED", now);
    throw error instanceof ProposalError ? error : new ProposalError("secretary.proposals.errors.failed");
  }
}

/** Kullanıcı öneriyi reddeder; kaynak kayıt değişmez. */
export async function dismissProposal(user: { id: string }, id: string, deps: Pick<ProposalDeps, "store">, now: Date): Promise<boolean> {
  return deps.store.transition(id, user.id, "PENDING", "DISMISSED", now);
}
