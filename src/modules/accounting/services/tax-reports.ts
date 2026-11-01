/**
 * ACC-2 saf hesaplayıcılar (DB'siz, test edilebilir): DATEV Buchungsstapel / Kontenbeschriftungen,
 * UStVA Kennzahlen, EÜR ve § 19 UStG sınır kontrolü. Girdi: iptal edilmemiş fişler (cent).
 */
import { datevAmount, datevDate, datevText, datevTimestamp, encodeCp1252 } from "@/shared/datev/extf";

export type TaxBookingRow = {
  id: string;
  bookingNumber: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  bookingDate: Date;
  description: string;
  receiptReference: string | null;
  amountCents: number;
  netCents: number;
  taxCents: number;
  taxRate: number;
  accountNumber: string | null; // para hesabı (Kasse/Bank)
  accountName: string;
  counterAccountNumber: string | null; // TRANSFER hedefi
  counterAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryNumber: string | null;
};

// ---------------------------------------------------------------- DATEV

/** DATEV BU-Schlüssel (Standard): USt 7 % = 2, USt 19 % = 3, VSt 7 % = 8, VSt 19 % = 9. */
export function datevTaxKey(type: TaxBookingRow["type"], rate: number): string {
  if (type === "INCOME") return rate === 19 ? "3" : rate === 7 ? "2" : "";
  if (type === "EXPENSE") return rate === 19 ? "9" : rate === 7 ? "8" : "";
  return "";
}

export type DatevIssue = { bookingNumber: string; id: string; reason: "accountMissing" | "categoryMissing" | "counterMissing" };

/** Dışa aktarım öncesi kontrol: her fişte Konto ve Gegenkonto numarası olmalı. */
export function datevIssues(rows: TaxBookingRow[]): DatevIssue[] {
  const issues: DatevIssue[] = [];
  for (const row of rows) {
    if (!row.accountNumber) issues.push({ bookingNumber: row.bookingNumber, id: row.id, reason: "accountMissing" });
    else if (row.type === "TRANSFER" ? !row.counterAccountNumber : !row.categoryNumber)
      issues.push({ bookingNumber: row.bookingNumber, id: row.id, reason: row.type === "TRANSFER" ? "counterMissing" : "categoryMissing" });
  }
  return issues;
}

export type DatevOptions = {
  consultantNo: string;
  clientNo: string;
  fiscalYearStart: Date;
  from: Date;
  to: Date;
  accountLength: number;
  useTaxKeys: boolean;
  label: string;
  now?: Date;
};

const BOOKING_COLUMNS = [
  "Umsatz (ohne Soll/Haben-Kz)", "Soll/Haben-Kennzeichen", "WKZ Umsatz", "Kurs", "Basis-Umsatz", "WKZ Basis-Umsatz",
  "Konto", "Gegenkonto (ohne BU-Schlüssel)", "BU-Schlüssel", "Belegdatum", "Belegfeld 1", "Belegfeld 2", "Skonto", "Buchungstext",
];

/**
 * EXTF Buchungsstapel (Datenkategorie 21, Formatversion 13). Konto = para hesabı; gelirde "S"
 * (Kasse/Bank borç), giderde "H". Virman: Konto = hedef, Gegenkonto = kaynak, "S". Tutar brüttür;
 * KDV ayrımı otomatik hesaplar (Automatikkonten) ya da isteğe bağlı BU-Schlüssel ile yapılır.
 */
export function buildDatevBookingsCsv(rows: TaxBookingRow[], options: DatevOptions): Uint8Array {
  const header = [
    '"EXTF"', "700", "21", '"Buchungsstapel"', "13", datevTimestamp(options.now ?? new Date()), "", '"RE"', '""', '""',
    options.consultantNo, options.clientNo, datevDate(options.fiscalYearStart), String(options.accountLength),
    datevDate(options.from), datevDate(options.to), datevText(options.label, 30), '""', "1", "0", "0", '"EUR"',
  ].join(";");
  const lines = rows.map((row) => {
    const transfer = row.type === "TRANSFER";
    const konto = transfer ? row.counterAccountNumber : row.accountNumber;
    const gegenkonto = transfer ? row.accountNumber : row.categoryNumber;
    const sh = row.type === "EXPENSE" ? "H" : "S";
    const day = row.bookingDate.toISOString().slice(8, 10) + row.bookingDate.toISOString().slice(5, 7);
    return [
      datevAmount(row.amountCents), `"${sh}"`, '"EUR"', "", "", "",
      konto ?? "", gegenkonto ?? "", options.useTaxKeys ? datevText(datevTaxKey(row.type, row.taxRate), 4) : '""',
      day, datevText(row.bookingNumber, 36), datevText(row.receiptReference && row.receiptReference.length <= 12 ? row.receiptReference : "", 12), "", datevText(row.description, 60),
    ].join(";");
  });
  const columns = BOOKING_COLUMNS.map((name) => `"${name}"`).join(";");
  return encodeCp1252([header, columns, ...lines].join("\r\n") + "\r\n");
}

/** EXTF Kontenbeschriftungen (Datenkategorie 20, Formatversion 2). */
export type AccountLabel = { number: string; name: string };
export type DatevLabelOptions = Omit<DatevOptions, "useTaxKeys" | "label">;

export function buildDatevAccountLabelsCsv(labels: AccountLabel[], options: DatevLabelOptions): Uint8Array {
  const header = [
    '"EXTF"', "700", "20", '"Kontenbeschriftungen"', "2", datevTimestamp(options.now ?? new Date()), "", '"RE"', '""', '""',
    options.consultantNo, options.clientNo, datevDate(options.fiscalYearStart), String(options.accountLength),
  ].join(";");
  const unique = [...new Map(labels.map((label) => [label.number, label])).values()].sort((a, b) => a.number.localeCompare(b.number));
  const lines = unique.map((label) => `${label.number};${datevText(label.name, 40)};"de-DE"`);
  return encodeCp1252([header, '"Konto";"Kontenbeschriftung";"Sprach-ID"', ...lines].join("\r\n") + "\r\n");
}

// ---------------------------------------------------------------- UStVA

export type UstvaKey = "81" | "86" | "66";
export type UstvaResult = {
  /** Bemessungsgrundlage (tam Euro'ya aşağı yuvarlanmış, formdaki gibi) ve hesaplanan vergi (cent). */
  kz81BaseEuros: number;
  kz81TaxCents: number;
  kz86BaseEuros: number;
  kz86TaxCents: number;
  kz66Cents: number;
  /** Kz 83: Vorauszahlung (+) / Erstattung (−), cent. */
  kz83Cents: number;
  /** Drill-down: hangi fiş hangi Kennzahl'a gitti. */
  rows: Record<UstvaKey, TaxBookingRow[]>;
  /** Kayıtlı KDV ile formül arasındaki yuvarlama farkı (bilgi). */
  bookedOutputTaxCents: number;
};

/**
 * UStVA (Ist-Versteuerung: ödeme tarihi = fiş tarihi). Kz 81/86 için form, vergiyi tam Euro
 * matrahtan hesaplar; Kz 66 kayıtlı Vorsteuer toplamıdır. %0 fişler (aidat, bağış, vergisiz
 * gelir) bildirime girmez.
 */
export function computeUstva(rows: TaxBookingRow[]): UstvaResult {
  const groups: Record<UstvaKey, TaxBookingRow[]> = { "81": [], "86": [], "66": [] };
  for (const row of rows) {
    if (row.type === "INCOME" && row.taxRate === 19) groups["81"].push(row);
    else if (row.type === "INCOME" && row.taxRate === 7) groups["86"].push(row);
    else if (row.type === "EXPENSE" && row.taxRate > 0) groups["66"].push(row);
  }
  const sum = (list: TaxBookingRow[], key: "netCents" | "taxCents") => list.reduce((total, row) => total + row[key], 0);
  const kz81BaseEuros = Math.floor(sum(groups["81"], "netCents") / 100);
  const kz86BaseEuros = Math.floor(sum(groups["86"], "netCents") / 100);
  const kz81TaxCents = kz81BaseEuros * 19;
  const kz86TaxCents = kz86BaseEuros * 7;
  const kz66Cents = sum(groups["66"], "taxCents");
  return {
    kz81BaseEuros,
    kz81TaxCents,
    kz86BaseEuros,
    kz86TaxCents,
    kz66Cents,
    kz83Cents: kz81TaxCents + kz86TaxCents - kz66Cents,
    rows: groups,
    bookedOutputTaxCents: sum(groups["81"], "taxCents") + sum(groups["86"], "taxCents"),
  };
}

export type VatPeriod = { key: string; from: Date; to: Date };

/** Yılın dönemleri: MONTH → 01..12, QUARTER → Q1..Q4, YEAR → J. */
export function vatPeriods(year: number, kind: "MONTH" | "QUARTER" | "YEAR"): VatPeriod[] {
  const range = (startMonth: number, months: number, key: string) => ({
    key,
    from: new Date(Date.UTC(year, startMonth, 1)),
    to: new Date(Date.UTC(year, startMonth + months, 0)),
  });
  if (kind === "YEAR") return [range(0, 12, "J")];
  if (kind === "QUARTER") return [0, 1, 2, 3].map((q) => range(q * 3, 3, `Q${q + 1}`));
  return Array.from({ length: 12 }, (_, m) => range(m, 1, String(m + 1).padStart(2, "0")));
}

// ---------------------------------------------------------------- EÜR

export type EuerLine = { categoryId: string | null; name: string; accountNumber: string | null; netCents: number; count: number };
export type EuerResult = {
  income: EuerLine[];
  expense: EuerLine[];
  incomeNetCents: number;
  outputTaxCents: number;
  expenseNetCents: number;
  inputTaxCents: number;
  /** Gewinn = (Einnahmen netto + vereinnahmte USt) − (Ausgaben netto + gezahlte VSt). */
  resultCents: number;
};

/** EÜR (§ 4 Abs. 3 EStG) özeti: kategori (SKR hesabı) bazında net toplamlar + USt/VSt satırları. */
export function computeEuer(rows: TaxBookingRow[]): EuerResult {
  const group = (type: "INCOME" | "EXPENSE") => {
    const map = new Map<string, EuerLine>();
    for (const row of rows.filter((item) => item.type === type)) {
      const key = row.categoryId ?? "-";
      const line = map.get(key) ?? { categoryId: row.categoryId, name: row.categoryName ?? "—", accountNumber: row.categoryNumber, netCents: 0, count: 0 };
      line.netCents += row.netCents;
      line.count += 1;
      map.set(key, line);
    }
    return [...map.values()].sort((a, b) => (a.accountNumber ?? "~").localeCompare(b.accountNumber ?? "~") || a.name.localeCompare(b.name));
  };
  const income = group("INCOME");
  const expense = group("EXPENSE");
  const total = (type: "INCOME" | "EXPENSE", key: "netCents" | "taxCents") =>
    rows.filter((row) => row.type === type).reduce((sum, row) => sum + row[key], 0);
  const incomeNetCents = total("INCOME", "netCents");
  const outputTaxCents = total("INCOME", "taxCents");
  const expenseNetCents = total("EXPENSE", "netCents");
  const inputTaxCents = total("EXPENSE", "taxCents");
  return { income, expense, incomeNetCents, outputTaxCents, expenseNetCents, inputTaxCents, resultCents: incomeNetCents + outputTaxCents - expenseNetCents - inputTaxCents };
}

// ---------------------------------------------------------------- § 19 UStG

/** 2025'ten itibaren: önceki yıl ≤ 25.000 €, cari yıl ≤ 100.000 € (brüt yerine net Umsatz). */
export const SMALL_BUSINESS_LIMITS = { previousYearCents: 25_000_00, currentYearCents: 100_000_00 } as const;

export type SmallBusinessCheck = { previousYearCents: number; currentYearCents: number; status: "ok" | "nextYear" | "lost" };

export function checkSmallBusiness(previousYearCents: number, currentYearCents: number): SmallBusinessCheck {
  const status =
    previousYearCents > SMALL_BUSINESS_LIMITS.previousYearCents || currentYearCents > SMALL_BUSINESS_LIMITS.currentYearCents
      ? "lost"
      : currentYearCents > SMALL_BUSINESS_LIMITS.previousYearCents
        ? "nextYear"
        : "ok";
  return { previousYearCents, currentYearCents, status };
}
