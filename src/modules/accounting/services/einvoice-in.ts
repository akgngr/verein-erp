/**
 * ACC-5 gelen e-fatura okuma: XRechnung/EN 16931 — UBL (Invoice/CreditNote) ve UN/CEFACT CII
 * (ZUGFeRD/Factur-X/XRechnung-CII). ZUGFeRD PDF'lerinde gömülü XML akışlardan çıkarılır.
 * Okunan değerler yalnızca ÖNERİDİR; kullanıcı formda kontrol edip onaylar.
 */
import { inflateSync } from "node:zlib";

import { parseAmount, xmlAll, xmlPath } from "./bank-parsers";

export type ParsedEInvoice = {
  syntax: "UBL" | "CII";
  number: string | null;
  issueDate: string | null;
  dueDate: string | null;
  serviceDate: string | null;
  sellerName: string | null;
  sellerVatId: string | null;
  sellerTaxNumber: string | null;
  sellerAddress: string | null;
  sellerIban: string | null;
  currency: string;
  netCents: number;
  taxCents: number;
  grossCents: number;
  payableCents: number;
  byRate: Array<{ rate: number; netCents: number; taxCents: number }>;
  lineCount: number;
};

export class EInvoiceParseError extends Error {}

const cents = (value: string | null) => (value ? Math.abs(parseAmount(value)) : 0);
const rate = (value: string | null) => Math.round(Number(value ?? "0"));
const ciiDate = (value: string | null) => (value && /^\d{8}$/.test(value.trim()) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value ? value.slice(0, 10) : null);

export function isEInvoiceXml(text: string): boolean {
  return /<(?:\w+:)?(Invoice|CreditNote|CrossIndustryInvoice)[\s>]/.test(text.slice(0, 5000));
}

export function parseEInvoice(xml: string): ParsedEInvoice {
  if (/<(?:\w+:)?CrossIndustryInvoice[\s>]/.test(xml)) return parseCii(xml);
  if (/<(?:\w+:)?(Invoice|CreditNote)[\s>]/.test(xml)) return parseUbl(xml);
  throw new EInvoiceParseError("accounting.payables.errors.notEInvoice");
}

function parseUbl(xml: string): ParsedEInvoice {
  const supplier = xmlAll(xml, "AccountingSupplierParty")[0] ?? "";
  const taxSchemes = xmlAll(supplier, "PartyTaxScheme");
  const schemeId = (scheme: string) => taxSchemes.find((item) => xmlPath(item, "TaxScheme/ID") === scheme);
  const address = xmlAll(supplier, "PostalAddress")[0] ?? "";
  const totals = xmlAll(xml, "LegalMonetaryTotal")[0] ?? "";
  const taxTotal = xmlAll(xml, "TaxTotal")[0] ?? "";
  const byRate = xmlAll(taxTotal, "TaxSubtotal").map((sub) => ({ rate: rate(xmlPath(sub, "TaxCategory/Percent")), netCents: cents(xmlPath(sub, "TaxableAmount")), taxCents: cents(xmlPath(sub, "TaxAmount")) }));
  const netCents = cents(xmlPath(totals, "TaxExclusiveAmount"));
  const grossCents = cents(xmlPath(totals, "TaxInclusiveAmount"));
  return {
    syntax: "UBL",
    number: firstTopLevel(xml, "ID"),
    issueDate: xmlPath(xml, "IssueDate"),
    dueDate: xmlPath(xml, "DueDate") ?? xmlPath(xml, "PaymentMeans/PaymentDueDate"),
    serviceDate: xmlPath(xml, "InvoicePeriod/StartDate") ? `${xmlPath(xml, "InvoicePeriod/StartDate")} – ${xmlPath(xml, "InvoicePeriod/EndDate") ?? ""}` : xmlPath(xml, "Delivery/ActualDeliveryDate"),
    sellerName: xmlPath(supplier, "PartyLegalEntity/RegistrationName") ?? xmlPath(supplier, "PartyName/Name"),
    sellerVatId: schemeId("VAT") ? xmlPath(schemeId("VAT") as string, "CompanyID") : null,
    sellerTaxNumber: schemeId("FC") ? xmlPath(schemeId("FC") as string, "CompanyID") : null,
    sellerAddress: [xmlPath(address, "StreetName"), [xmlPath(address, "PostalZone"), xmlPath(address, "CityName")].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
    sellerIban: xmlPath(xml, "PaymentMeans/PayeeFinancialAccount/ID")?.replace(/\s/g, "") ?? null,
    currency: xmlPath(xml, "DocumentCurrencyCode") ?? "EUR",
    netCents,
    taxCents: cents(xmlPath(taxTotal, "TaxAmount")) || grossCents - netCents,
    grossCents,
    payableCents: cents(xmlPath(totals, "PayableAmount")) || grossCents,
    byRate,
    lineCount: xmlAll(xml, "InvoiceLine").length + xmlAll(xml, "CreditNoteLine").length,
  };
}

/** Kök düzeyindeki ilk <cbc:ID> (alt öğelerdeki ID'lerden önce gelir). */
function firstTopLevel(xml: string, name: string): string | null {
  const body = xml.replace(/<(?:\w+:)?(AccountingSupplierParty|AccountingCustomerParty|InvoiceLine|CreditNoteLine|PaymentMeans|TaxTotal|OrderReference|ContractDocumentReference|AdditionalDocumentReference|BillingReference|Delivery|PayeeParty)[\s\S]*?<\/(?:\w+:)?\1>/g, "");
  return xmlPath(body, name);
}

function parseCii(xml: string): ParsedEInvoice {
  const seller = xmlAll(xml, "SellerTradeParty")[0] ?? "";
  const registrations = [...seller.matchAll(/<(?:\w+:)?ID\s+schemeID="(VA|FC)"[^>]*>([^<]+)</g)];
  const settlement = xmlAll(xml, "ApplicableHeaderTradeSettlement")[0] ?? "";
  const summation = xmlAll(settlement, "SpecifiedTradeSettlementHeaderMonetarySummation")[0] ?? "";
  const address = xmlAll(seller, "PostalTradeAddress")[0] ?? "";
  const byRate = xmlAll(settlement, "ApplicableTradeTax").map((tax) => ({ rate: rate(xmlPath(tax, "RateApplicablePercent")), netCents: cents(xmlPath(tax, "BasisAmount")), taxCents: cents(xmlPath(tax, "CalculatedAmount")) }));
  const netCents = cents(xmlPath(summation, "TaxBasisTotalAmount"));
  const grossCents = cents(xmlPath(summation, "GrandTotalAmount"));
  return {
    syntax: "CII",
    number: xmlPath(xml, "ExchangedDocument/ID"),
    issueDate: ciiDate(xmlPath(xml, "ExchangedDocument/IssueDateTime/DateTimeString")),
    dueDate: ciiDate(xmlPath(settlement, "SpecifiedTradePaymentTerms/DueDateDateTime/DateTimeString")),
    serviceDate: ciiDate(xmlPath(xml, "ActualDeliverySupplyChainEvent/OccurrenceDateTime/DateTimeString")),
    sellerName: xmlPath(seller, "Name"),
    sellerVatId: registrations.find((item) => item[1] === "VA")?.[2].trim() ?? null,
    sellerTaxNumber: registrations.find((item) => item[1] === "FC")?.[2].trim() ?? null,
    sellerAddress: [xmlPath(address, "LineOne"), [xmlPath(address, "PostcodeCode"), xmlPath(address, "CityName")].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
    sellerIban: xmlPath(settlement, "PayeePartyCreditorFinancialAccount/IBANID")?.replace(/\s/g, "") ?? null,
    currency: xmlPath(settlement, "InvoiceCurrencyCode") ?? "EUR",
    netCents,
    taxCents: cents(xmlPath(summation, "TaxTotalAmount")) || grossCents - netCents,
    grossCents,
    payableCents: cents(xmlPath(summation, "DuePayableAmount")) || grossCents,
    byRate,
    lineCount: xmlAll(xml, "IncludedSupplyChainTradeLineItem").length,
  };
}

/**
 * ZUGFeRD / Factur-X PDF: gömülü XML dosyası bir akış (stream) olarak saklanır; akışları açar
 * (FlateDecode) ve CrossIndustryInvoice içeren ilkini döndürür. Bulunamazsa null (düz PDF).
 */
export function extractEmbeddedInvoiceXml(pdf: Buffer): string | null {
  const text = pdf.toString("latin1");
  const pattern = /stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const start = match.index + match[0].length;
    const end = text.indexOf("endstream", start);
    if (end < 0) break;
    const dictStart = text.lastIndexOf("<<", match.index);
    const dict = dictStart >= 0 ? text.slice(dictStart, match.index) : "";
    if (/\/Subtype\s*\/Image|\/Type\s*\/XObject|\/FontFile/.test(dict)) continue;
    const raw = pdf.subarray(start, end);
    let content: string | null = null;
    if (/\/FlateDecode/.test(dict)) {
      try {
        content = inflateSync(raw).toString("utf8");
      } catch {
        content = null;
      }
    } else if (!/\/Filter/.test(dict)) content = raw.toString("utf8");
    if (content && /<(?:\w+:)?(CrossIndustryInvoice|Invoice)[\s>]/.test(content.slice(0, 3000))) return content.trim();
  }
  return null;
}

export type Section14Check = { key: "sellerName" | "sellerAddress" | "sellerTaxId" | "number" | "issueDate" | "serviceDate" | "taxBreakdown"; ok: boolean };

/**
 * § 14 Abs. 4 UStG zorunlu bilgiler (Vorsteuerabzug için). Kleinbetragsrechnung (≤ 250 € brüt,
 * § 33 UStDV): vergi numarası, fatura no. ve hizmet tarihi aranmaz.
 */
export function section14Checks(input: { sellerName: string | null; sellerAddress: string | null; sellerVatId: string | null; sellerTaxNumber: string | null; number: string | null; issueDate: string | null; serviceDate: string | null; grossCents: number; byRate: Array<{ rate: number }> }): Section14Check[] {
  const small = input.grossCents <= 25_000;
  const checks: Section14Check[] = [
    { key: "sellerName", ok: Boolean(input.sellerName) },
    { key: "sellerAddress", ok: Boolean(input.sellerAddress) },
    { key: "issueDate", ok: Boolean(input.issueDate) },
    { key: "taxBreakdown", ok: input.byRate.length > 0 },
  ];
  if (!small) {
    checks.push({ key: "sellerTaxId", ok: Boolean(input.sellerVatId || input.sellerTaxNumber) });
    checks.push({ key: "number", ok: Boolean(input.number) });
    checks.push({ key: "serviceDate", ok: Boolean(input.serviceDate) });
  }
  return checks;
}
