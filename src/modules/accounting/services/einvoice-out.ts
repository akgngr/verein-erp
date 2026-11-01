/**
 * ACC-5 giden e-fatura: XRechnung 3.0 (UBL 2.1 Invoice, EN 16931). Saf builder + eksik alan
 * kontrolü. ZUGFeRD (PDF/A-3 + gömülü CII) PDF kütüphanesinin PDF/A-3 desteği olmadığından
 * şimdilik üretilmez; XRechnung B2G ve 2025+ B2B e-fatura zorunluluğu için yeterlidir.
 */
export type XInvoiceParty = {
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string; // ISO 3166-1 alpha-2
  vatId: string | null;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  contactName: string | null;
};

export type XInvoiceData = {
  number: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string | null;
  serviceDate: string | null; // serbest metin → not olarak
  buyerReference: string | null; // Leitweg-ID (B2G) / Bestellreferenz
  currency: "EUR";
  seller: XInvoiceParty;
  buyer: XInvoiceParty;
  iban: string | null;
  bic: string | null;
  paymentTerms: string | null;
  note: string | null;
  smallBusiness: boolean;
  lines: Array<{ position: number; description: string; quantity: number; unit: string | null; unitPriceCents: number; netCents: number; taxRate: number }>;
  byRate: Array<{ rate: number; netCents: number; taxCents: number }>;
  netCents: number;
  taxCents: number;
  grossCents: number;
  paidCents: number;
};

export type XInvoiceIssue = "sellerAddress" | "sellerTaxId" | "sellerContact" | "buyerAddress" | "iban" | "dueOrTerms";

/** XRechnung iş kuralları (BR-DE-*) için en sık eksik kalan alanlar. */
export function xrechnungIssues(data: XInvoiceData): XInvoiceIssue[] {
  const issues: XInvoiceIssue[] = [];
  if (!data.seller.street || !data.seller.postalCode || !data.seller.city) issues.push("sellerAddress");
  if (!data.seller.vatId && !data.seller.taxNumber) issues.push("sellerTaxId");
  if (!data.seller.email || !data.seller.phone) issues.push("sellerContact");
  if (!data.buyer.city || !data.buyer.postalCode) issues.push("buyerAddress");
  if (!data.iban) issues.push("iban");
  if (!data.dueDate && !data.paymentTerms) issues.push("dueOrTerms");
  return issues;
}

export const XRECHNUNG_CUSTOMIZATION = "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0";
export const PEPPOL_PROFILE = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const amount = (cents: number) => (cents / 100).toFixed(2);
const tag = (name: string, value: string | null | undefined, attrs = "") => (value ? `<${name}${attrs}>${esc(value)}</${name}>` : "");
const category = (rate: number, smallBusiness: boolean) => (rate > 0 ? "S" : smallBusiness ? "E" : "Z");

function party(p: XInvoiceParty, role: "seller" | "buyer"): string {
  const taxScheme = [
    p.vatId ? `<cac:PartyTaxScheme>${tag("cbc:CompanyID", p.vatId)}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : "",
    role === "seller" && p.taxNumber ? `<cac:PartyTaxScheme>${tag("cbc:CompanyID", p.taxNumber)}<cac:TaxScheme><cbc:ID>FC</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : "",
  ].join("");
  const contact =
    role === "seller"
      ? `<cac:Contact>${tag("cbc:Name", p.contactName ?? p.name)}${tag("cbc:Telephone", p.phone)}${tag("cbc:ElectronicMail", p.email)}</cac:Contact>`
      : "";
  return [
    "<cac:Party>",
    p.email ? `<cbc:EndpointID schemeID="EM">${esc(p.email)}</cbc:EndpointID>` : "",
    `<cac:PostalAddress>${tag("cbc:StreetName", p.street)}${tag("cbc:CityName", p.city)}${tag("cbc:PostalZone", p.postalCode)}<cac:Country><cbc:IdentificationCode>${esc(p.countryCode)}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>`,
    taxScheme,
    `<cac:PartyLegalEntity>${tag("cbc:RegistrationName", p.name)}</cac:PartyLegalEntity>`,
    contact,
    "</cac:Party>",
  ].join("");
}

export function buildXRechnungUbl(data: XInvoiceData): string {
  const exemption = data.smallBusiness ? "Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 UStG" : "Nicht steuerbar / steuerfrei"; // i18n-ignore: XRechnung-Pflichttext (Almanca)
  const subtotals = data.byRate
    .map((group) => {
      const cat = category(group.rate, data.smallBusiness);
      return `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${amount(group.netCents)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${amount(group.taxCents)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${cat}</cbc:ID><cbc:Percent>${group.rate}</cbc:Percent>${cat === "E" ? tag("cbc:TaxExemptionReason", exemption) : ""}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`;
    })
    .join("");
  const lines = data.lines
    .map(
      (line) =>
        `<cac:InvoiceLine><cbc:ID>${line.position}</cbc:ID><cbc:InvoicedQuantity unitCode="${unitCode(line.unit)}">${line.quantity}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">${amount(line.netCents)}</cbc:LineExtensionAmount><cac:Item>${tag("cbc:Name", line.description.slice(0, 200))}<cac:ClassifiedTaxCategory><cbc:ID>${category(line.taxRate, data.smallBusiness)}</cbc:ID><cbc:Percent>${line.taxRate}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="EUR">${amount(line.unitPriceCents)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`,
    )
    .join("");
  const notes = [data.note, data.serviceDate ? `Leistungszeitraum: ${data.serviceDate}` : null].filter(Boolean) as string[]; // i18n-ignore: Rechnungstext
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">',
    tag("cbc:CustomizationID", XRECHNUNG_CUSTOMIZATION),
    tag("cbc:ProfileID", PEPPOL_PROFILE),
    tag("cbc:ID", data.number),
    tag("cbc:IssueDate", data.issueDate),
    tag("cbc:DueDate", data.dueDate),
    "<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>",
    notes.map((note) => tag("cbc:Note", note)).join(""),
    "<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>",
    tag("cbc:BuyerReference", data.buyerReference ?? data.number),
    `<cac:AccountingSupplierParty>${party(data.seller, "seller")}</cac:AccountingSupplierParty>`,
    `<cac:AccountingCustomerParty>${party(data.buyer, "buyer")}</cac:AccountingCustomerParty>`,
    data.iban
      ? `<cac:PaymentMeans><cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>${tag("cbc:PaymentID", data.number)}<cac:PayeeFinancialAccount>${tag("cbc:ID", data.iban.replace(/\s/g, ""))}${tag("cbc:Name", data.seller.name)}${data.bic ? `<cac:FinancialInstitutionBranch>${tag("cbc:ID", data.bic)}</cac:FinancialInstitutionBranch>` : ""}</cac:PayeeFinancialAccount></cac:PaymentMeans>`
      : "",
    data.paymentTerms ? `<cac:PaymentTerms>${tag("cbc:Note", data.paymentTerms)}</cac:PaymentTerms>` : "",
    `<cac:TaxTotal><cbc:TaxAmount currencyID="EUR">${amount(data.taxCents)}</cbc:TaxAmount>${subtotals}</cac:TaxTotal>`,
    `<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">${amount(data.netCents)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">${amount(data.netCents)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">${amount(data.grossCents)}</cbc:TaxInclusiveAmount>${data.paidCents ? `<cbc:PrepaidAmount currencyID="EUR">${amount(data.paidCents)}</cbc:PrepaidAmount>` : ""}<cbc:PayableAmount currencyID="EUR">${amount(data.grossCents - data.paidCents)}</cbc:PayableAmount></cac:LegalMonetaryTotal>`,
    lines,
    "</ubl:Invoice>",
  ].join("\n");
}

/** UN/ECE Rec 20 birim kodları (sık kullanılanlar); bilinmeyen → C62 (adet). */
export function unitCode(unit: string | null): string {
  const value = (unit ?? "").trim().toLowerCase().replace(/\.$/, "");
  const map: Record<string, string> = { stk: "H87", stück: "H87", st: "H87", h: "HUR", std: "HUR", stunde: "HUR", stunden: "HUR", tag: "DAY", tage: "DAY", monat: "MON", kg: "KGM", km: "KMT", m: "MTR", l: "LTR", pauschal: "LS", psch: "LS" };
  return map[value] ?? "C62";
}

/** Serbest metin alıcı adresi → sokak / PLZ / şehir / ülke (Alman "12345 Ort" kalıbı). */
export function parseFreeAddress(address: string | null, name: string): { street: string | null; postalCode: string | null; city: string | null; countryCode: string } {
  const lines = (address ?? "").split(/\r?\n|,/).map((line) => line.trim()).filter((line) => line && line !== name);
  let postalCode: string | null = null;
  let city: string | null = null;
  let street: string | null = null;
  let countryCode = "DE";
  for (const [index, line] of lines.entries()) {
    const match = /^(?:(D|DE|A|AT|CH)-)?(\d{4,5})\s+(.+)$/i.exec(line);
    if (match && !postalCode) {
      postalCode = match[2];
      city = match[3];
      if (/^(A|AT)$/i.test(match[1] ?? "")) countryCode = "AT";
      if (/^CH$/i.test(match[1] ?? "")) countryCode = "CH";
      street = street ?? (index > 0 ? lines[index - 1] : null);
    }
  }
  const last = lines[lines.length - 1]?.toLowerCase();
  if (last && countryCodeOf(last) !== null) countryCode = countryCodeOf(last) as string;
  return { street: street ?? lines.find((line) => /\d/.test(line) && line !== postalCode) ?? null, postalCode, city, countryCode };
}

export function countryCodeOf(country: string | null): string | null {
  const value = (country ?? "").trim().toLowerCase();
  const map: Record<string, string> = { deutschland: "DE", germany: "DE", almanya: "DE", de: "DE", österreich: "AT", austria: "AT", at: "AT", schweiz: "CH", switzerland: "CH", ch: "CH", niederlande: "NL", frankreich: "FR", türkei: "TR", turkey: "TR", türkiye: "TR" };
  return map[value] ?? null;
}
