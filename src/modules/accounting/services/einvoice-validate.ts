/**
 * E-fatura doğrulama (E_INVOICE.md EI-2): EN 16931 ve XRechnung 3.0 (BR-DE) kurallarının en sık ihlal edilenleri,
 * saf ve bağımlılıksız. Tam Schematron doğrulaması için isteğe bağlı KoSIT doğrulayıcısı kullanılır
 * (services/kosit.ts). Kural kodları resmî adlarıyla tutulur; açıklamalar accounting.einvoice.rules.<KOD>.
 */
import type { ParsedEInvoice } from "./einvoice-in";
import type { XInvoiceData } from "./einvoice-out";

export type EInvoiceIssue = { rule: string; severity: "error" | "warning" };

const err = (rule: string): EInvoiceIssue => ({ rule, severity: "error" });
const warn = (rule: string): EInvoiceIssue => ({ rule, severity: "warning" });
/** 1 sent yuvarlama toleransı (satır bazlı yuvarlama farkları). */
const close = (a: number, b: number, tolerance = 1) => Math.abs(a - b) <= tolerance;
const category = (rate: number, smallBusiness: boolean) => (rate > 0 ? "S" : smallBusiness ? "E" : "Z");

/** Giden fatura / iptal faturası (XRechnung ve ZUGFeRD aynı veriden üretilir). */
export function validateOutgoing(data: XInvoiceData): EInvoiceIssue[] {
  const issues: EInvoiceIssue[] = [];
  const add = (condition: boolean, issue: EInvoiceIssue) => condition && issues.push(issue);

  // Belge
  add(!data.number, err("BR-02"));
  add(!/^\d{4}-\d{2}-\d{2}$/.test(data.issueDate ?? ""), err("BR-03"));
  add(data.currency !== "EUR", err("BR-05"));
  add(!data.lines.length, err("BR-16"));
  add(data.typeCode === 381 && !data.precedingInvoice, warn("BR-55"));

  // Taraflar
  add(!data.seller.name, err("BR-06"));
  add(!data.buyer.name, err("BR-07"));
  add(!data.seller.countryCode, err("BR-09"));
  add(!data.buyer.countryCode, err("BR-11"));
  add(!data.seller.city, err("BR-DE-3"));
  add(!data.seller.postalCode, err("BR-DE-4"));
  add(!data.seller.phone, err("BR-DE-6"));
  add(!data.seller.email, err("BR-DE-7"));
  add(!data.buyer.city, err("BR-DE-8"));
  add(!data.buyer.postalCode, err("BR-DE-9"));
  add(!data.seller.vatId && !data.seller.taxNumber, err("BR-DE-16"));
  add(!data.seller.street, warn("BR-08"));
  add(!data.buyer.street, warn("BR-10"));
  add(!data.buyerReference, warn("BR-DE-15"));
  add(Boolean(data.seller.vatId) && !/^[A-Z]{2}[A-Z0-9]{2,13}$/.test((data.seller.vatId ?? "").replace(/\s/g, "")), err("BR-CO-09"));

  // Ödeme
  add(!data.iban && data.typeCode !== 381, err("BR-DE-1"));
  add(Boolean(data.iban) && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test((data.iban ?? "").replace(/\s/g, "").toUpperCase()), err("BR-DE-19"));
  add(!data.dueDate && !data.paymentTerms && data.typeCode !== 381, warn("BR-CO-25"));

  // Satırlar
  data.lines.forEach((line) => {
    add(!line.description.trim(), err("BR-25"));
    add(line.quantity === 0, warn("BR-22"));
    add(line.unitPriceCents < 0, err("BR-27"));
    add(!close(Math.round(line.quantity * line.unitPriceCents), line.netCents), err("BR-LINE-NET"));
  });

  // Toplamlar
  const lineSum = data.lines.reduce((sum, line) => sum + line.netCents, 0);
  add(!close(lineSum, data.netCents, data.lines.length), err("BR-CO-10"));
  add(!close(data.netCents + data.taxCents, data.grossCents), err("BR-CO-15"));
  add(data.paidCents > data.grossCents, err("BR-CO-16"));

  // KDV dökümü
  const rateSum = data.byRate.reduce((sum, group) => sum + group.taxCents, 0);
  add(!close(rateSum, data.taxCents, data.byRate.length), err("BR-CO-14"));
  for (const group of data.byRate) {
    const cat = category(group.rate, data.smallBusiness);
    const linesOfRate = data.lines.filter((line) => line.taxRate === group.rate).reduce((sum, line) => sum + line.netCents, 0);
    add(!close(linesOfRate, group.netCents, data.lines.length), err(`BR-${cat}-08`));
    if (cat === "S") add(!close(Math.round((group.netCents * group.rate) / 100), group.taxCents, data.lines.length), err("BR-S-09"));
    else add(group.taxCents !== 0, err(`BR-${cat}-09`));
    if (cat === "S") add(!data.seller.vatId && !data.seller.taxNumber, err("BR-S-02"));
  }
  add(data.smallBusiness && data.taxCents !== 0, err("BR-E-09"));

  return dedupe(issues);
}

/** Gelen e-fatura (ayrıştırılmış): içe alırken kaydedilir, ret sebebi değildir. */
export function validateIncoming(parsed: ParsedEInvoice): EInvoiceIssue[] {
  const issues: EInvoiceIssue[] = [];
  const add = (condition: boolean, issue: EInvoiceIssue) => condition && issues.push(issue);
  add(!parsed.number, err("BR-02"));
  add(!parsed.issueDate, err("BR-03"));
  add(parsed.currency !== "EUR", warn("BR-05"));
  add(!parsed.sellerName, err("BR-06"));
  add(!parsed.lineCount, err("BR-16"));
  add(!parsed.sellerVatId && !parsed.sellerTaxNumber, warn("BR-DE-16"));
  add(!parsed.sellerAddress, warn("BR-08"));
  add(!close(parsed.netCents + parsed.taxCents, parsed.grossCents, 2), err("BR-CO-15"));
  const rateNet = parsed.byRate.reduce((sum, group) => sum + group.netCents, 0);
  const rateTax = parsed.byRate.reduce((sum, group) => sum + group.taxCents, 0);
  add(parsed.byRate.length > 0 && !close(rateNet, parsed.netCents, parsed.byRate.length), err("BR-CO-13"));
  add(parsed.byRate.length > 0 && !close(rateTax, parsed.taxCents, parsed.byRate.length), err("BR-CO-14"));
  for (const group of parsed.byRate) {
    if (group.rate > 0) add(!close(Math.round((group.netCents * group.rate) / 100), group.taxCents, 2), warn("BR-S-09"));
  }
  add(parsed.payableCents > parsed.grossCents, err("BR-CO-16"));
  return dedupe(issues);
}

function dedupe(issues: EInvoiceIssue[]): EInvoiceIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => (seen.has(issue.rule) ? false : (seen.add(issue.rule), true)));
}

/** Arayüzde kullanılan tüm kural kodları (çeviri anahtarlarıyla birebir; test bunu denetler). */
export const EINVOICE_RULES = [
  "BR-02", "BR-03", "BR-05", "BR-06", "BR-07", "BR-08", "BR-09", "BR-10", "BR-11", "BR-16", "BR-22", "BR-25", "BR-27", "BR-55",
  "BR-CO-09", "BR-CO-10", "BR-CO-13", "BR-CO-14", "BR-CO-15", "BR-CO-16", "BR-CO-25",
  "BR-S-02", "BR-S-08", "BR-S-09", "BR-Z-08", "BR-Z-09", "BR-E-08", "BR-E-09",
  "BR-DE-1", "BR-DE-3", "BR-DE-4", "BR-DE-6", "BR-DE-7", "BR-DE-8", "BR-DE-9", "BR-DE-15", "BR-DE-16", "BR-DE-19",
  "BR-LINE-NET",
] as const;
