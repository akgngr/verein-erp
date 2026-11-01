import "server-only";

import { randomBytes } from "node:crypto";

import { importBankTransactions } from "@/modules/accounting/server";
import { getDb } from "@/shared/db";

import { getProvider } from "./settings";

const OVERLAP_DAYS = 5; // geç kayda geçen hareketler için; mükerrerler hash ile atlanır
const FIRST_SYNC_DAYS = 90;

export async function listConnections() {
  return getDb().bankConnection.findMany({
    orderBy: { createdAt: "desc" },
    include: { accounts: { orderBy: { createdAt: "asc" } } },
  });
}

/** Onay sürecini başlatır; kullanıcı dönen bağlantıyla bankanın sayfasına yönlendirilir. */
export async function startConnection(input: { institutionId: string; institutionName: string; redirectBase: string; language: string; actor: { id: string; label: string } }) {
  const provider = await getProvider();
  const reference = randomBytes(16).toString("hex");
  const redirectUrl = `${input.redirectBase}/api/banking/callback?ref=${reference}`;
  const consent = await provider.createConsent({ institutionId: input.institutionId, redirectUrl, reference, language: input.language });
  const connection = await getDb().bankConnection.create({
    data: {
      provider: provider.key,
      institutionId: input.institutionId,
      institutionName: input.institutionName.slice(0, 200),
      externalId: consent.externalId,
      reference,
      consentExpiresAt: consent.expiresAt,
      createdById: input.actor.id,
      createdByLabel: input.actor.label,
    },
    select: { id: true },
  });
  return { id: connection.id, link: consent.link };
}

/** Onay durumunu sağlayıcıdan okur; bağlandıysa hesapları kaydeder. */
export async function refreshConnection(id: string) {
  const db = getDb();
  const connection = await db.bankConnection.findUniqueOrThrow({ where: { id } });
  if (!connection.externalId) return connection.status;
  const provider = await getProvider(connection.provider);
  const consent = await provider.getConsent(connection.externalId);
  for (const account of consent.accounts) {
    await db.bankConnectionAccount.upsert({
      where: { connectionId_externalId: { connectionId: id, externalId: account.externalId } },
      create: { connectionId: id, externalId: account.externalId, iban: account.iban, name: account.name, currency: account.currency },
      update: { iban: account.iban, name: account.name, currency: account.currency },
    });
  }
  await db.bankConnection.update({ where: { id }, data: { status: consent.state, lastError: null } });
  return consent.state;
}

export async function findConnectionByReference(reference: string) {
  return getDb().bankConnection.findUnique({ where: { reference }, select: { id: true } });
}

export async function mapAccount(accountId: string, accountingAccountId: string | null) {
  await getDb().bankConnectionAccount.update({ where: { id: accountId }, data: { accountingAccountId } });
}

/** Eşlenmiş hesapların hareketlerini çeker ve muhasebe → Banka eşleştirmesine aktarır. */
export async function syncConnection(id: string, actor: { id: string; label: string }): Promise<{ accounts: number; total: number; created: number }> {
  const db = getDb();
  const connection = await db.bankConnection.findUniqueOrThrow({ where: { id }, include: { accounts: true } });
  if (connection.consentExpiresAt && connection.consentExpiresAt < new Date()) {
    await db.bankConnection.update({ where: { id }, data: { status: "EXPIRED" } });
    return { accounts: 0, total: 0, created: 0 };
  }
  const provider = await getProvider(connection.provider);
  let total = 0;
  let created = 0;
  let accounts = 0;
  for (const account of connection.accounts) {
    if (!account.accountingAccountId) continue;
    const from = new Date(account.lastSyncAt ?? Date.now() - FIRST_SYNC_DAYS * 86_400_000);
    from.setUTCDate(from.getUTCDate() - (account.lastSyncAt ? OVERLAP_DAYS : 0));
    const rows = (await provider.fetchTransactions(account.externalId, from.toISOString().slice(0, 10))).filter((row) => row.currency === "EUR" && row.bookingDate);
    const result = await importBankTransactions({
      accountId: account.accountingAccountId,
      format: "API",
      fileName: `${connection.institutionName} · ${account.iban ?? account.name ?? ""}`.slice(0, 200),
      rows,
      actor,
    });
    await db.bankConnectionAccount.update({ where: { id: account.id }, data: { lastSyncAt: new Date(), lastSyncCount: result.created } });
    total += result.total;
    created += result.created;
    accounts += 1;
  }
  await db.bankConnection.update({ where: { id }, data: { lastSyncAt: new Date(), lastError: null } });
  return { accounts, total, created };
}

/** Bağlantıyı kaldırır: önce sağlayıcıdaki onay iptal edilir (veri erişimi biter), sonra yerel kayıt. */
export async function removeConnection(id: string) {
  const db = getDb();
  const connection = await db.bankConnection.findUniqueOrThrow({ where: { id } });
  if (connection.externalId) {
    try {
      const provider = await getProvider(connection.provider);
      await provider.deleteConsent(connection.externalId);
    } catch (err) {
      // Sağlayıcıya ulaşılamazsa onay en geç süresi dolunca biter; yerel kayıt yine silinir.
      console.error("[banking] consent delete failed:", err instanceof Error ? err.message : err);
    }
  }
  await db.bankConnection.delete({ where: { id } });
}

export async function markError(id: string, message: string) {
  await getDb().bankConnection.update({ where: { id }, data: { lastError: message.slice(0, 200) } });
}
