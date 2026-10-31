/**
 * SKR03/SKR04 için sık kullanılan hesap numarası önerileri (kamuya açık standart kontenrahmen
 * bilgisinden derlenmiş, kısa liste). Kullanıcı serbest numara da girebilir; öneri yalnızca kolaylık.
 */
export type ChartOfAccounts = "SKR03" | "SKR04";
export type SkrSuggestion = { number: string; key: string; taxRate?: 0 | 7 | 19 };

export const SKR_SUGGESTIONS: Record<ChartOfAccounts, { income: SkrSuggestion[]; expense: SkrSuggestion[]; money: SkrSuggestion[] }> = {
  SKR03: {
    income: [
      { number: "8400", key: "revenue19", taxRate: 19 },
      { number: "8300", key: "revenue7", taxRate: 7 },
      { number: "8200", key: "revenueExempt", taxRate: 0 },
      { number: "8195", key: "smallBusinessRevenue", taxRate: 0 },
    ],
    expense: [
      { number: "4210", key: "rent" },
      { number: "4930", key: "officeSupplies", taxRate: 19 },
      { number: "4920", key: "telecom", taxRate: 19 },
      { number: "4360", key: "insurance", taxRate: 0 },
      { number: "4600", key: "advertising", taxRate: 19 },
      { number: "4660", key: "travel" },
      { number: "4950", key: "legalConsulting", taxRate: 19 },
      { number: "4970", key: "bankFees", taxRate: 0 },
    ],
    money: [
      { number: "1000", key: "cash" },
      { number: "1200", key: "bank" },
    ],
  },
  SKR04: {
    income: [
      { number: "4400", key: "revenue19", taxRate: 19 },
      { number: "4300", key: "revenue7", taxRate: 7 },
      { number: "4100", key: "revenueExempt", taxRate: 0 },
      { number: "4185", key: "smallBusinessRevenue", taxRate: 0 },
    ],
    expense: [
      { number: "6310", key: "rent" },
      { number: "6815", key: "officeSupplies", taxRate: 19 },
      { number: "6805", key: "telecom", taxRate: 19 },
      { number: "6400", key: "insurance", taxRate: 0 },
      { number: "6600", key: "advertising", taxRate: 19 },
      { number: "6650", key: "travel" },
      { number: "6825", key: "legalConsulting", taxRate: 19 },
      { number: "6855", key: "bankFees", taxRate: 0 },
    ],
    money: [
      { number: "1600", key: "cash" },
      { number: "1800", key: "bank" },
    ],
  },
};
