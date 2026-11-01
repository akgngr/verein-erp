import type { BankTransactionInput } from "@/modules/accounting/server";

export type Institution = { id: string; name: string; bic: string | null; logo: string | null };
export type ProviderAccount = { externalId: string; iban: string | null; name: string | null; currency: string };
export type ConsentState = "PENDING" | "LINKED" | "EXPIRED" | "ERROR";

/** Sağlayıcı hatası: ayrıntı loglanır, kullanıcıya genel mesaj gösterilir (anahtar/yanıt sızmaz). */
export class BankProviderError extends Error {
  constructor(
    message: string,
    readonly code: "credentials" | "provider" | "notConfigured",
  ) {
    super(message);
  }
}

/** Lisanslı PSD2 hesap bilgisi sağlayıcısı (AISP). Banka giriş bilgileri asla bu uygulamaya gelmez. */
export interface BankProvider {
  readonly key: string;
  listInstitutions(country: string): Promise<Institution[]>;
  createConsent(input: { institutionId: string; redirectUrl: string; reference: string; language: string }): Promise<{ externalId: string; link: string; expiresAt: Date }>;
  getConsent(externalId: string): Promise<{ state: ConsentState; accounts: ProviderAccount[] }>;
  fetchTransactions(accountExternalId: string, dateFrom: string): Promise<BankTransactionInput[]>;
  deleteConsent(externalId: string): Promise<void>;
}
