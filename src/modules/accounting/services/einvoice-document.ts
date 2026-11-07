/**
 * EI-3 gelen e-faturanın okunabilir görünümü: saklanan ORİJİNAL XML'den (UBL veya CII) tam belge
 * yapısı çıkarılır. Görünüm ve PDF her zaman bu yapıdan üretilir; veritabanı alanları kullanılmaz.
 * Saf fonksiyonlar; bağımlılıksız (yalnız basit XML yardımcıları).
 */
import { decodeXml, parseAmount, xmlAll, xmlPath } from "./bank-parsers";
import { EInvoiceParseError } from "./einvoice-in";

export type EInvoiceParty = {
  name: string | null;
  addressLines: string[];
  countryCode: string | null;
  vatId: string | null;
  taxNumber: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
};

export type EInvoiceLine = {
  id: string | null;
  name: string;
  description: string | null;
  quantity: string | null;
  unitCode: string | null;
  unitPriceCents: number | null;
  netCents: number;
  rate: number | null;
};

export type EInvoiceDocument = {
  syntax: "UBL" | "CII";
  typeCode: string | null;
  number: string | null;
  issueDate: string | null;
  dueDate: string | null;
  servicePeriod: string | null;
  currency: string;
  buyerReference: string | null;
  orderReference: string | null;
  precedingInvoice: string | null;
  notes: string[];
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  lines: EInvoiceLine[];
  taxes: Array<{ category: string | null; rate: number; netCents: number; taxCents: number; exemptionReason: string | null }>;
  totals: { lineCents: number; allowanceCents: number; chargeCents: number; netCents: number; taxCents: number; grossCents: number; prepaidCents: number; payableCents: number };
  payment: { meansCode: string | null; iban: string | null; bic: string | null; accountName: string | null; reference: string | null; terms: string | null; mandateReference: string | null; creditorId: string | null };
};

const money = (value: string | null) => (value ? parseAmount(value) : 0);
const optionalMoney = (value: string | null) => (value ? parseAmount(value) : null);
const percent = (value: string | null) => (value === null ? null : Number(value));
const ciiDate = (value: string | null) => (value && /^\d{8}$/.test(value.trim()) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value ? value.slice(0, 10) : null);
const clean = (value: string | null) => (value?.trim() ? value.trim() : null);
const compact = (values: Array<string | null>) => values.map(clean).filter((value): value is string => Boolean(value));

/** Bir öğenin özniteliği (ör. <cbc:InvoicedQuantity unitCode="C62">). */
function attribute(xml: string, tag: string, name: string): string | null {
  const match = new RegExp(`<(?:\\w+:)?${tag}\\s[^>]*\\b${name}="([^"]*)"`).exec(xml);
  return match ? match[1] : null;
}

/** Verilen alt öğeleri çıkarır (üst düzey alanları okurken iç içe eşleşmeleri önler). */
function without(xml: string, tags: string[]): string {
  return xml.replace(new RegExp(`<(?:\\w+:)?(${tags.join("|")})[\\s>][\\s\\S]*?<\\/(?:\\w+:)?\\1>`, "g"), "");
}

export function parseEInvoiceDocument(xml: string): EInvoiceDocument {
  if (/<(?:\w+:)?CrossIndustryInvoice[\s>]/.test(xml)) return parseCii(xml);
  if (/<(?:\w+:)?(Invoice|CreditNote)[\s>]/.test(xml)) return parseUbl(xml);
  throw new EInvoiceParseError("accounting.payables.errors.notEInvoice");
}

function ublParty(fragment: string): EInvoiceParty {
  const schemes = xmlAll(fragment, "PartyTaxScheme");
  const scheme = (id: string) => schemes.find((item) => xmlPath(item, "TaxScheme/ID") === id);
  const address = xmlAll(fragment, "PostalAddress")[0] ?? "";
  const vat = scheme("VAT");
  const fc = scheme("FC");
  return {
    name: clean(xmlPath(fragment, "PartyLegalEntity/RegistrationName") ?? xmlPath(fragment, "PartyName/Name")),
    addressLines: compact([xmlPath(address, "StreetName"), xmlPath(address, "AdditionalStreetName"), compact([xmlPath(address, "PostalZone"), xmlPath(address, "CityName")]).join(" ")]),
    countryCode: clean(xmlPath(address, "Country/IdentificationCode")),
    vatId: vat ? clean(xmlPath(vat, "CompanyID")) : null,
    taxNumber: fc ? clean(xmlPath(fc, "CompanyID")) : null,
    contactName: clean(xmlPath(fragment, "Contact/Name")),
    phone: clean(xmlPath(fragment, "Contact/Telephone")),
    email: clean(xmlPath(fragment, "Contact/ElectronicMail")),
  };
}

function parseUbl(xml: string): EInvoiceDocument {
  const lineTag = /<(?:\w+:)?CreditNoteLine[\s>]/.test(xml) ? "CreditNoteLine" : "InvoiceLine";
  const quantityTag = lineTag === "CreditNoteLine" ? "CreditedQuantity" : "InvoicedQuantity";
  const head = without(xml, ["AccountingSupplierParty", "AccountingCustomerParty", "InvoiceLine", "CreditNoteLine", "PaymentMeans", "PaymentTerms", "TaxTotal", "LegalMonetaryTotal", "OrderReference", "BillingReference", "Delivery", "InvoicePeriod", "AdditionalDocumentReference", "ContractDocumentReference", "PayeeParty", "AllowanceCharge"]);
  const totals = xmlAll(xml, "LegalMonetaryTotal")[0] ?? "";
  const taxTotal = xmlAll(xml, "TaxTotal")[0] ?? "";
  const means = xmlAll(xml, "PaymentMeans")[0] ?? "";
  const start = xmlPath(xml, "InvoicePeriod/StartDate");
  const end = xmlPath(xml, "InvoicePeriod/EndDate");
  return {
    syntax: "UBL",
    typeCode: clean(xmlPath(head, "InvoiceTypeCode") ?? xmlPath(head, "CreditNoteTypeCode")),
    number: clean(xmlPath(head, "ID")),
    issueDate: clean(xmlPath(head, "IssueDate")),
    dueDate: clean(xmlPath(head, "DueDate") ?? xmlPath(means, "PaymentDueDate")),
    servicePeriod: start || end ? compact([start, end]).join(" – ") : clean(xmlPath(xml, "Delivery/ActualDeliveryDate")),
    currency: clean(xmlPath(head, "DocumentCurrencyCode")) ?? "EUR",
    buyerReference: clean(xmlPath(head, "BuyerReference")),
    orderReference: clean(xmlPath(xml, "OrderReference/ID")),
    precedingInvoice: clean(xmlPath(xml, "BillingReference/InvoiceDocumentReference/ID")),
    notes: compact(xmlAll(head, "Note").map(decodeXml)),
    seller: ublParty(xmlAll(xml, "AccountingSupplierParty")[0] ?? ""),
    buyer: ublParty(xmlAll(xml, "AccountingCustomerParty")[0] ?? ""),
    lines: xmlAll(xml, lineTag).map((line) => ({
      id: clean(xmlPath(line, "ID")),
      name: clean(xmlPath(line, "Item/Name")) ?? "",
      description: clean(xmlPath(line, "Item/Description")),
      quantity: clean(xmlPath(line, quantityTag)),
      unitCode: attribute(line, quantityTag, "unitCode"),
      unitPriceCents: optionalMoney(xmlPath(line, "Price/PriceAmount")),
      netCents: money(xmlPath(line, "LineExtensionAmount")),
      rate: percent(xmlPath(line, "ClassifiedTaxCategory/Percent")),
    })),
    taxes: xmlAll(taxTotal, "TaxSubtotal").map((sub) => ({
      category: clean(xmlPath(sub, "TaxCategory/ID")),
      rate: percent(xmlPath(sub, "TaxCategory/Percent")) ?? 0,
      netCents: money(xmlPath(sub, "TaxableAmount")),
      taxCents: money(xmlPath(sub, "TaxAmount")),
      exemptionReason: clean(xmlPath(sub, "TaxExemptionReason")),
    })),
    totals: {
      lineCents: money(xmlPath(totals, "LineExtensionAmount")),
      allowanceCents: money(xmlPath(totals, "AllowanceTotalAmount")),
      chargeCents: money(xmlPath(totals, "ChargeTotalAmount")),
      netCents: money(xmlPath(totals, "TaxExclusiveAmount")),
      taxCents: money(xmlPath(taxTotal, "TaxAmount")),
      grossCents: money(xmlPath(totals, "TaxInclusiveAmount")),
      prepaidCents: money(xmlPath(totals, "PrepaidAmount")),
      payableCents: money(xmlPath(totals, "PayableAmount")),
    },
    payment: {
      meansCode: clean(xmlPath(means, "PaymentMeansCode")),
      iban: clean(xmlPath(means, "PayeeFinancialAccount/ID") ?? xmlPath(means, "PaymentMandate/PayerFinancialAccount/ID")),
      bic: clean(xmlPath(means, "PayeeFinancialAccount/FinancialInstitutionBranch/ID")),
      accountName: clean(xmlPath(means, "PayeeFinancialAccount/Name")),
      reference: clean(xmlPath(means, "PaymentID")),
      terms: clean(xmlPath(xml, "PaymentTerms/Note")),
      mandateReference: clean(xmlPath(means, "PaymentMandate/ID")),
      creditorId: null,
    },
  };
}

function ciiParty(fragment: string): EInvoiceParty {
  const registrations = [...fragment.matchAll(/<(?:\w+:)?ID\s+schemeID="(VA|FC)"[^>]*>([^<]+)</g)];
  const address = xmlAll(fragment, "PostalTradeAddress")[0] ?? "";
  return {
    name: clean(xmlPath(without(fragment, ["DefinedTradeContact", "SpecifiedLegalOrganization"]), "Name")),
    addressLines: compact([xmlPath(address, "LineOne"), xmlPath(address, "LineTwo"), compact([xmlPath(address, "PostcodeCode"), xmlPath(address, "CityName")]).join(" ")]),
    countryCode: clean(xmlPath(address, "CountryID")),
    vatId: clean(registrations.find((item) => item[1] === "VA")?.[2] ?? null),
    taxNumber: clean(registrations.find((item) => item[1] === "FC")?.[2] ?? null),
    contactName: clean(xmlPath(fragment, "DefinedTradeContact/PersonName")),
    phone: clean(xmlPath(fragment, "TelephoneUniversalCommunication/CompleteNumber")),
    email: clean(xmlPath(fragment, "EmailURIUniversalCommunication/URIID")),
  };
}

function parseCii(xml: string): EInvoiceDocument {
  const header = xmlAll(xml, "ExchangedDocument")[0] ?? "";
  const agreement = xmlAll(xml, "ApplicableHeaderTradeAgreement")[0] ?? "";
  const settlement = xmlAll(xml, "ApplicableHeaderTradeSettlement")[0] ?? "";
  const summation = xmlAll(settlement, "SpecifiedTradeSettlementHeaderMonetarySummation")[0] ?? "";
  const means = xmlAll(settlement, "SpecifiedTradeSettlementPaymentMeans")[0] ?? "";
  const terms = xmlAll(settlement, "SpecifiedTradePaymentTerms")[0] ?? "";
  const start = ciiDate(xmlPath(settlement, "BillingSpecifiedPeriod/StartDateTime/DateTimeString"));
  const end = ciiDate(xmlPath(settlement, "BillingSpecifiedPeriod/EndDateTime/DateTimeString"));
  return {
    syntax: "CII",
    typeCode: clean(xmlPath(header, "TypeCode")),
    number: clean(xmlPath(header, "ID")),
    issueDate: ciiDate(xmlPath(header, "IssueDateTime/DateTimeString")),
    dueDate: ciiDate(xmlPath(terms, "DueDateDateTime/DateTimeString")),
    servicePeriod: start || end ? compact([start, end]).join(" – ") : ciiDate(xmlPath(xml, "ActualDeliverySupplyChainEvent/OccurrenceDateTime/DateTimeString")),
    currency: clean(xmlPath(settlement, "InvoiceCurrencyCode")) ?? "EUR",
    buyerReference: clean(xmlPath(agreement, "BuyerReference")),
    orderReference: clean(xmlPath(agreement, "BuyerOrderReferencedDocument/IssuerAssignedID")),
    precedingInvoice: clean(xmlPath(settlement, "InvoiceReferencedDocument/IssuerAssignedID")),
    notes: compact(xmlAll(header, "IncludedNote").map((note) => xmlPath(note, "Content"))),
    seller: ciiParty(xmlAll(agreement, "SellerTradeParty")[0] ?? ""),
    buyer: ciiParty(xmlAll(agreement, "BuyerTradeParty")[0] ?? ""),
    lines: xmlAll(xml, "IncludedSupplyChainTradeLineItem").map((line) => ({
      id: clean(xmlPath(line, "AssociatedDocumentLineDocument/LineID")),
      name: clean(xmlPath(line, "SpecifiedTradeProduct/Name")) ?? "",
      description: clean(xmlPath(line, "SpecifiedTradeProduct/Description")),
      quantity: clean(xmlPath(line, "BilledQuantity")),
      unitCode: attribute(line, "BilledQuantity", "unitCode"),
      unitPriceCents: optionalMoney(xmlPath(line, "NetPriceProductTradePrice/ChargeAmount")),
      netCents: money(xmlPath(line, "SpecifiedTradeSettlementLineMonetarySummation/LineTotalAmount")),
      rate: percent(xmlPath(line, "ApplicableTradeTax/RateApplicablePercent")),
    })),
    taxes: xmlAll(settlement, "ApplicableTradeTax").map((tax) => ({
      category: clean(xmlPath(tax, "CategoryCode")),
      rate: percent(xmlPath(tax, "RateApplicablePercent")) ?? 0,
      netCents: money(xmlPath(tax, "BasisAmount")),
      taxCents: money(xmlPath(tax, "CalculatedAmount")),
      exemptionReason: clean(xmlPath(tax, "ExemptionReason")),
    })),
    totals: {
      lineCents: money(xmlPath(summation, "LineTotalAmount")),
      allowanceCents: money(xmlPath(summation, "AllowanceTotalAmount")),
      chargeCents: money(xmlPath(summation, "ChargeTotalAmount")),
      netCents: money(xmlPath(summation, "TaxBasisTotalAmount")),
      taxCents: money(xmlPath(summation, "TaxTotalAmount")),
      grossCents: money(xmlPath(summation, "GrandTotalAmount")),
      prepaidCents: money(xmlPath(summation, "TotalPrepaidAmount")),
      payableCents: money(xmlPath(summation, "DuePayableAmount")),
    },
    payment: {
      meansCode: clean(xmlPath(means, "TypeCode")),
      iban: clean(xmlPath(means, "PayeePartyCreditorFinancialAccount/IBANID") ?? xmlPath(means, "PayerPartyDebtorFinancialAccount/IBANID")),
      bic: clean(xmlPath(means, "PayeeSpecifiedCreditorFinancialInstitution/BICID")),
      accountName: clean(xmlPath(means, "PayeePartyCreditorFinancialAccount/AccountName")),
      reference: clean(xmlPath(settlement, "PaymentReference")),
      terms: clean(xmlPath(terms, "Description")),
      mandateReference: clean(xmlPath(terms, "DirectDebitMandateID")),
      creditorId: clean(xmlPath(settlement, "CreditorReferenceID")),
    },
  };
}
