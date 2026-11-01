import "server-only";

import type { BankTransactionInput } from "@/modules/accounting/server";

import type { BankProvider, ConsentState, Institution, ProviderAccount } from "./types";

/**
 * Test sağlayıcısı (yalnızca üretim DIŞINDA): gerçek bankaya bağlanmaz; onay anında verilir,
 * iki kurgusal hesap ve son 60 güne yayılmış kurgusal hareketler döner (example.com, örnek IBAN).
 */
export class MockBankProvider implements BankProvider {
  readonly key = "MOCK";

  async listInstitutions(): Promise<Institution[]> {
    return [{ id: "MOCK_DEMOBANK", name: "Demo Bank (Test)", bic: "DEMODEFFXXX", logo: null }];
  }

  async createConsent(input: { redirectUrl: string; reference: string }) {
    const url = new URL(input.redirectUrl);
    url.searchParams.set("ref", input.reference);
    return { externalId: `mock-${input.reference}`, link: url.toString(), expiresAt: new Date(Date.now() + 90 * 86_400_000) };
  }

  async getConsent(): Promise<{ state: ConsentState; accounts: ProviderAccount[] }> {
    return {
      state: "LINKED",
      accounts: [
        { externalId: "mock-giro", iban: "DE89370400440532013000", name: "Girokonto (Test)", currency: "EUR" },
        { externalId: "mock-spenden", iban: "DE02120300000000202051", name: "Spendenkonto (Test)", currency: "EUR" },
      ],
    };
  }

  async fetchTransactions(accountExternalId: string): Promise<BankTransactionInput[]> {
    const rows: BankTransactionInput[] = [];
    const names = ["Anna Muster", "Ben Beispiel", "Stadtwerke Test", "Druckerei Probe", "Clara Testmann"];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i * 5);
      const incoming = i % 3 !== 2;
      rows.push({
        bookingDate: date.toISOString().slice(0, 10),
        valueDate: date.toISOString().slice(0, 10),
        amountCents: incoming ? 2500 + i * 500 : -(4800 + i * 300),
        currency: "EUR",
        counterpartyName: names[i % names.length],
        counterpartyIban: "DE89370400440532013000",
        purpose: incoming ? `Mitgliedsbeitrag ${i + 1} (Test)` : `Rechnung ${1000 + i} (Test)`,
        reference: `${accountExternalId}-${i}`,
      });
    }
    return rows;
  }

  async deleteConsent(): Promise<void> {}
}
