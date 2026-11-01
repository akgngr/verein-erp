import "server-only";

import type { BankTransactionInput } from "@/modules/accounting/server";

import { BankProviderError, type BankProvider, type ConsentState, type Institution, type ProviderAccount } from "./types";

const BASE = "https://bankaccountdata.gocardless.com/api/v2";
const CONSENT_DAYS = 90;
const HISTORY_DAYS = 90;

type Token = { access: string; expiresAt: number };
const tokenCache = new Map<string, Token>();

/**
 * GoCardless Bank Account Data (eski adıyla Nordigen): AB'de lisanslı AISP, PSD2 üzerinden
 * Alman bankalarına salt okunur erişim. Kimlik bilgileri (secret id/key) yönetici ayarlarında
 * şifreli saklanır; bu sınıf yalnızca bellekte kullanır ve hiçbir yere yazmaz.
 */
export class GoCardlessProvider implements BankProvider {
  readonly key = "GOCARDLESS";

  constructor(
    private readonly secretId: string,
    private readonly secretKey: string,
  ) {}

  private async token(): Promise<string> {
    const cached = tokenCache.get(this.secretId);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.access;
    const response = await fetch(`${BASE}/token/new/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ secret_id: this.secretId, secret_key: this.secretKey }),
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 401 || response.status === 403) throw new BankProviderError("token rejected", "credentials"); // i18n-ignore (iç hata, loglanır)
    if (!response.ok) throw new BankProviderError(`token ${response.status}`, "provider");
    const body = (await response.json()) as { access: string; access_expires: number };
    tokenCache.set(this.secretId, { access: body.access, expiresAt: Date.now() + body.access_expires * 1000 });
    return body.access;
  }

  private async call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
    const response = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${await this.token()}`, "Content-Type": "application/json", Accept: "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new BankProviderError(`${init.method ?? "GET"} ${path.split("?")[0]} → ${response.status}`, "provider");
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  async listInstitutions(country: string): Promise<Institution[]> {
    const rows = await this.call<{ id: string; name: string; bic?: string; logo?: string }[]>(`/institutions/?country=${encodeURIComponent(country.toLowerCase())}`);
    return rows.map((row) => ({ id: row.id, name: row.name, bic: row.bic ?? null, logo: row.logo ?? null }));
  }

  async createConsent(input: { institutionId: string; redirectUrl: string; reference: string; language: string }) {
    const agreement = await this.call<{ id: string }>("/agreements/enduser/", {
      method: "POST",
      body: { institution_id: input.institutionId, max_historical_days: HISTORY_DAYS, access_valid_for_days: CONSENT_DAYS, access_scope: ["details", "transactions"] },
    });
    const requisition = await this.call<{ id: string; link: string }>("/requisitions/", {
      method: "POST",
      body: { redirect: input.redirectUrl, institution_id: input.institutionId, reference: input.reference, agreement: agreement.id, user_language: input.language.toUpperCase() },
    });
    return { externalId: requisition.id, link: requisition.link, expiresAt: new Date(Date.now() + CONSENT_DAYS * 86_400_000) };
  }

  async getConsent(externalId: string): Promise<{ state: ConsentState; accounts: ProviderAccount[] }> {
    const requisition = await this.call<{ status: string; accounts: string[] }>(`/requisitions/${encodeURIComponent(externalId)}/`);
    const state: ConsentState = requisition.status === "LN" ? "LINKED" : requisition.status === "EX" ? "EXPIRED" : ["RJ", "SU"].includes(requisition.status) ? "ERROR" : "PENDING";
    const accounts: ProviderAccount[] = [];
    if (state === "LINKED") {
      for (const id of requisition.accounts) {
        const details = await this.call<{ account: { iban?: string; name?: string; product?: string; currency?: string } }>(`/accounts/${encodeURIComponent(id)}/details/`);
        accounts.push({ externalId: id, iban: details.account.iban ?? null, name: details.account.name ?? details.account.product ?? null, currency: details.account.currency ?? "EUR" });
      }
    }
    return { state, accounts };
  }

  async fetchTransactions(accountExternalId: string, dateFrom: string): Promise<BankTransactionInput[]> {
    const body = await this.call<{ transactions: { booked: GoCardlessTransaction[] } }>(`/accounts/${encodeURIComponent(accountExternalId)}/transactions/?date_from=${dateFrom}`);
    return body.transactions.booked.map(mapGoCardlessTransaction);
  }

  async deleteConsent(externalId: string): Promise<void> {
    await this.call(`/requisitions/${encodeURIComponent(externalId)}/`, { method: "DELETE" });
  }
}

export type GoCardlessTransaction = {
  transactionId?: string;
  endToEndId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: { amount: string; currency: string };
  creditorName?: string;
  creditorAccount?: { iban?: string };
  debtorName?: string;
  debtorAccount?: { iban?: string };
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  remittanceInformationStructured?: string;
  additionalInformation?: string;
};

/** GoCardless (Berlin Group NextGenPSD2 biçimi) hareketini ekstre satırına çevirir. */
export function mapGoCardlessTransaction(tx: GoCardlessTransaction): BankTransactionInput {
  const amountCents = Math.round(Number(tx.transactionAmount.amount) * 100);
  const incoming = amountCents >= 0;
  const purpose =
    tx.remittanceInformationUnstructured ??
    tx.remittanceInformationUnstructuredArray?.join(" ") ??
    tx.remittanceInformationStructured ??
    tx.additionalInformation ??
    "";
  const reference = tx.endToEndId && tx.endToEndId !== "NOTPROVIDED" ? tx.endToEndId : (tx.transactionId ?? null);
  return {
    bookingDate: (tx.bookingDate ?? tx.valueDate ?? "").slice(0, 10),
    valueDate: tx.valueDate?.slice(0, 10) ?? null,
    amountCents,
    currency: tx.transactionAmount.currency,
    counterpartyName: (incoming ? tx.debtorName : tx.creditorName) ?? null,
    counterpartyIban: (incoming ? tx.debtorAccount?.iban : tx.creditorAccount?.iban) ?? null,
    purpose: purpose.replace(/\s+/g, " ").trim(),
    reference,
  };
}
