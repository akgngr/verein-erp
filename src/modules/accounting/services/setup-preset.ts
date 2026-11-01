import "server-only";

import type { Prisma, Sphere } from "@prisma/client";

import { SKR_SUGGESTIONS, type ChartOfAccounts } from "./skr";

/**
 * Kurulum sihirbazı için muhasebe hazır ayarları (kurum türüne göre). Kategori ve hesap adları
 * Almanca'dır (muhasebe verisi, DATEV/Finanzamt ile aynı dil). Hesap numaraları yalnızca
 * doğrulanmış SKR03/SKR04 öneri listesinden gelir; emin olunmayanlar boş bırakılır.
 */
export type OrganizationType = "VEREIN" | "KLEINGEWERBE" | "MITTELSTAND" | "FREELANCER" | "NACHHILFE";

type CategoryPreset = { name: string; direction: "INCOME" | "EXPENSE"; sphere: Sphere; skr?: string; taxRate?: 0 | 7 | 19; isAsset?: boolean };

const C = (name: string, direction: "INCOME" | "EXPENSE", options: Partial<CategoryPreset> = {}): CategoryPreset => ({ name, direction, sphere: "IDEELL", ...options });

const BUSINESS_EXPENSES: CategoryPreset[] = [
  C("Miete", "EXPENSE", { skr: "rent" }),
  C("Bürobedarf", "EXPENSE", { skr: "officeSupplies", taxRate: 19 }),
  C("Telefon/Internet", "EXPENSE", { skr: "telecom", taxRate: 19 }),
  C("Versicherungen", "EXPENSE", { skr: "insurance" }),
  C("Werbung", "EXPENSE", { skr: "advertising", taxRate: 19 }),
  C("Reisekosten", "EXPENSE", { skr: "travel" }),
  C("Rechts- und Beratungskosten", "EXPENSE", { skr: "legalConsulting", taxRate: 19 }),
  C("Kontoführung", "EXPENSE", { skr: "bankFees" }),
  C("Anlagegüter", "EXPENSE", { isAsset: true, taxRate: 19 }),
];

export const ACCOUNTING_PRESETS: Record<OrganizationType, { chart: ChartOfAccounts; smallBusiness: boolean; taxMethod: "IST" | "SOLL"; vatPeriod: "MONTH" | "QUARTER" | "YEAR"; categories: CategoryPreset[] }> = {
  VEREIN: {
    chart: "SKR03",
    smallBusiness: false,
    taxMethod: "IST",
    vatPeriod: "YEAR",
    categories: [
      C("Mitgliedsbeiträge", "INCOME"),
      C("Spenden", "INCOME"),
      C("Zuschüsse", "INCOME"),
      C("Zinserträge", "INCOME", { sphere: "ASSET_MANAGEMENT" }),
      C("Veranstaltungen (Zweckbetrieb)", "INCOME", { sphere: "PURPOSE_OPERATION" }),
      C("Verkauf und Bewirtung", "INCOME", { sphere: "ECONOMIC_OPERATION", skr: "revenue19", taxRate: 19 }),
      C("Raumkosten", "EXPENSE", { skr: "rent" }),
      C("Bürobedarf", "EXPENSE", { skr: "officeSupplies" }),
      C("Versicherungen", "EXPENSE", { skr: "insurance" }),
      C("Veranstaltungskosten", "EXPENSE", { sphere: "PURPOSE_OPERATION" }),
      C("Wareneinkauf Bewirtung", "EXPENSE", { sphere: "ECONOMIC_OPERATION", taxRate: 19 }),
      C("Kontoführung", "EXPENSE", { skr: "bankFees" }),
    ],
  },
  KLEINGEWERBE: {
    chart: "SKR03",
    smallBusiness: true,
    taxMethod: "IST",
    vatPeriod: "QUARTER",
    categories: [C("Umsatzerlöse (§ 19 UStG)", "INCOME", { sphere: "ECONOMIC_OPERATION", skr: "smallBusinessRevenue" }), C("Wareneinkauf", "EXPENSE", { sphere: "ECONOMIC_OPERATION" }), ...BUSINESS_EXPENSES.map((item) => ({ ...item, sphere: "ECONOMIC_OPERATION" as Sphere }))],
  },
  MITTELSTAND: {
    chart: "SKR04",
    smallBusiness: false,
    taxMethod: "SOLL",
    vatPeriod: "MONTH",
    categories: [
      C("Umsatzerlöse 19 %", "INCOME", { sphere: "ECONOMIC_OPERATION", skr: "revenue19", taxRate: 19 }),
      C("Umsatzerlöse 7 %", "INCOME", { sphere: "ECONOMIC_OPERATION", skr: "revenue7", taxRate: 7 }),
      C("Steuerfreie Umsätze", "INCOME", { sphere: "ECONOMIC_OPERATION", skr: "revenueExempt" }),
      C("Wareneinkauf", "EXPENSE", { sphere: "ECONOMIC_OPERATION", taxRate: 19 }),
      C("Löhne und Gehälter", "EXPENSE", { sphere: "ECONOMIC_OPERATION" }),
      ...BUSINESS_EXPENSES.map((item) => ({ ...item, sphere: "ECONOMIC_OPERATION" as Sphere })),
    ],
  },
  FREELANCER: {
    chart: "SKR03",
    smallBusiness: false,
    taxMethod: "IST",
    vatPeriod: "QUARTER",
    categories: [C("Honorare 19 %", "INCOME", { sphere: "ECONOMIC_OPERATION", skr: "revenue19", taxRate: 19 }), C("Honorare steuerfrei", "INCOME", { sphere: "ECONOMIC_OPERATION", skr: "revenueExempt" }), ...BUSINESS_EXPENSES.map((item) => ({ ...item, sphere: "ECONOMIC_OPERATION" as Sphere }))],
  },
  NACHHILFE: {
    chart: "SKR03",
    smallBusiness: true,
    taxMethod: "IST",
    vatPeriod: "QUARTER",
    categories: [
      C("Nachhilfe-/Kursgebühren", "INCOME", { sphere: "ECONOMIC_OPERATION", skr: "revenueExempt" }),
      C("Lehrkräfte-Honorare", "EXPENSE", { sphere: "ECONOMIC_OPERATION" }),
      C("Lernmaterial", "EXPENSE", { sphere: "ECONOMIC_OPERATION", skr: "officeSupplies" }),
      C("Raumkosten", "EXPENSE", { sphere: "ECONOMIC_OPERATION", skr: "rent" }),
      C("Telefon/Internet", "EXPENSE", { sphere: "ECONOMIC_OPERATION", skr: "telecom" }),
      C("Werbung", "EXPENSE", { sphere: "ECONOMIC_OPERATION", skr: "advertising" }),
      C("Kontoführung", "EXPENSE", { sphere: "ECONOMIC_OPERATION", skr: "bankFees" }),
    ],
  },
};

function skrNumber(chart: ChartOfAccounts, key: string | undefined): string | null {
  if (!key) return null;
  const lists = SKR_SUGGESTIONS[chart];
  return [...lists.income, ...lists.expense, ...lists.money].find((item) => item.key === key)?.number ?? null;
}

/**
 * Hazır ayarları uygular: vergi ayarları + eksik kategoriler + Kasse/Bank hesapları. Var olan
 * kayıtlara DOKUNMAZ (ada göre atlar) — sihirbaz tekrar çalıştırılabilir.
 */
export async function applyAccountingPreset(
  tx: Prisma.TransactionClient,
  input: { type: OrganizationType; smallBusiness: boolean; chart: ChartOfAccounts; openingDate: Date },
): Promise<{ categories: number; accounts: number }> {
  const preset = ACCOUNTING_PRESETS[input.type];
  const tax = { chartOfAccounts: input.chart, smallBusiness: input.smallBusiness, taxMethod: preset.taxMethod, vatPeriod: preset.vatPeriod };
  await tx.accountingSettings.upsert({ where: { id: "singleton" }, update: tax, create: { id: "singleton", ...tax } });

  const existing = new Set((await tx.accountingCategory.findMany({ select: { name: true } })).map((row) => row.name));
  let categories = 0;
  for (const [index, category] of preset.categories.entries()) {
    if (existing.has(category.name)) continue;
    await tx.accountingCategory.create({
      data: {
        name: category.name,
        direction: category.direction,
        sphere: category.sphere,
        sortOrder: index,
        accountNumber: skrNumber(input.chart, category.skr),
        defaultTaxRate: input.smallBusiness ? 0 : category.taxRate ?? 0,
        isAsset: category.isAsset ?? false,
      },
    });
    categories += 1;
  }

  let accounts = 0;
  const accountRows = await tx.accountingAccount.findMany({ select: { type: true } });
  for (const [type, name, key] of [["CASH", "Kasse", "cash"], ["BANK", "Bank", "bank"]] as const) {
    if (accountRows.some((row) => row.type === type)) continue;
    await tx.accountingAccount.create({ data: { name, type, openingDate: input.openingDate, openingBalance: "0", accountNumber: skrNumber(input.chart, key) } });
    accounts += 1;
  }
  return { categories, accounts };
}
