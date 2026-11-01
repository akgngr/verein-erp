/**
 * ACC-5b: UN/CEFACT CII (Factur-X / ZUGFeRD 2.x, profil EN 16931) üretimi. XRechnung UBL ile
 * aynı XInvoiceData'dan beslenir; ZUGFeRD PDF'ine "factur-x.xml" olarak gömülür.
 */
import { unitCode, type XInvoiceData, type XInvoiceParty } from "./einvoice-out";

export const EN16931_GUIDELINE = "urn:cen.eu:en16931:2017";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const amount = (cents: number) => (cents / 100).toFixed(2);
const tag = (name: string, value: string | null | undefined, attrs = "") => (value ? `<${name}${attrs}>${esc(value)}</${name}>` : "");
const date102 = (iso: string) => `<udt:DateTimeString format="102">${iso.replace(/-/g, "")}</udt:DateTimeString>`;
const category = (rate: number, smallBusiness: boolean) => (rate > 0 ? "S" : smallBusiness ? "E" : "Z");

function party(name: "SellerTradeParty" | "BuyerTradeParty", p: XInvoiceParty, seller: boolean): string {
  return [
    `<ram:${name}>`,
    tag("ram:Name", p.name),
    seller && (p.phone || p.email) ? `<ram:DefinedTradeContact>${tag("ram:PersonName", p.contactName ?? p.name)}${p.phone ? `<ram:TelephoneUniversalCommunication>${tag("ram:CompleteNumber", p.phone)}</ram:TelephoneUniversalCommunication>` : ""}${p.email ? `<ram:EmailURIUniversalCommunication>${tag("ram:URIID", p.email)}</ram:EmailURIUniversalCommunication>` : ""}</ram:DefinedTradeContact>` : "",
    `<ram:PostalTradeAddress>${tag("ram:PostcodeCode", p.postalCode)}${tag("ram:LineOne", p.street)}${tag("ram:CityName", p.city)}<ram:CountryID>${esc(p.countryCode)}</ram:CountryID></ram:PostalTradeAddress>`,
    p.email ? `<ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(p.email)}</ram:URIID></ram:URIUniversalCommunication>` : "",
    p.vatId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(p.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>` : "",
    seller && p.taxNumber ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${esc(p.taxNumber)}</ram:ID></ram:SpecifiedTaxRegistration>` : "",
    `</ram:${name}>`,
  ].join("");
}

export function buildCiiInvoice(data: XInvoiceData): string {
  const exemption = data.smallBusiness ? "Kein Ausweis von Umsatzsteuer, da Kleinunternehmer gemäß § 19 UStG" : "Nicht steuerbar / steuerfrei"; // i18n-ignore: Pflichttext (Almanca)
  const lines = data.lines
    .map(
      (line) =>
        `<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>${line.position}</ram:LineID></ram:AssociatedDocumentLineDocument><ram:SpecifiedTradeProduct>${tag("ram:Name", line.description.slice(0, 200))}</ram:SpecifiedTradeProduct><ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>${amount(line.unitPriceCents)}</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement><ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${unitCode(line.unit)}">${line.quantity}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery><ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>${category(line.taxRate, data.smallBusiness)}</ram:CategoryCode><ram:RateApplicablePercent>${line.taxRate}</ram:RateApplicablePercent></ram:ApplicableTradeTax><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${amount(line.netCents)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>`,
    )
    .join("");
  const taxes = data.byRate
    .map((group) => {
      const cat = category(group.rate, data.smallBusiness);
      return `<ram:ApplicableTradeTax><ram:CalculatedAmount>${amount(group.taxCents)}</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>${cat === "E" ? tag("ram:ExemptionReason", exemption) : ""}<ram:BasisAmount>${amount(group.netCents)}</ram:BasisAmount><ram:CategoryCode>${cat}</ram:CategoryCode><ram:RateApplicablePercent>${group.rate}</ram:RateApplicablePercent></ram:ApplicableTradeTax>`;
    })
    .join("");
  const notes = [data.note, data.serviceDate ? `Leistungszeitraum: ${data.serviceDate}` : null].filter(Boolean) as string[]; // i18n-ignore: Rechnungstext
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">',
    `<rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter>${tag("ram:ID", EN16931_GUIDELINE)}</ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>`,
    `<rsm:ExchangedDocument>${tag("ram:ID", data.number)}<ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime>${date102(data.issueDate)}</ram:IssueDateTime>${notes.map((note) => `<ram:IncludedNote>${tag("ram:Content", note)}</ram:IncludedNote>`).join("")}</rsm:ExchangedDocument>`,
    "<rsm:SupplyChainTradeTransaction>",
    lines,
    `<ram:ApplicableHeaderTradeAgreement>${tag("ram:BuyerReference", data.buyerReference ?? data.number)}${party("SellerTradeParty", data.seller, true)}${party("BuyerTradeParty", data.buyer, false)}</ram:ApplicableHeaderTradeAgreement>`,
    "<ram:ApplicableHeaderTradeDelivery/>",
    "<ram:ApplicableHeaderTradeSettlement>",
    tag("ram:PaymentReference", data.number),
    "<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>",
    data.iban ? `<ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount>${tag("ram:IBANID", data.iban.replace(/\s/g, ""))}</ram:PayeePartyCreditorFinancialAccount>${data.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution>${tag("ram:BICID", data.bic)}</ram:PayeeSpecifiedCreditorFinancialInstitution>` : ""}</ram:SpecifiedTradeSettlementPaymentMeans>` : "",
    taxes,
    data.dueDate || data.paymentTerms ? `<ram:SpecifiedTradePaymentTerms>${tag("ram:Description", data.paymentTerms)}${data.dueDate ? `<ram:DueDateDateTime>${date102(data.dueDate)}</ram:DueDateDateTime>` : ""}</ram:SpecifiedTradePaymentTerms>` : "",
    `<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${amount(data.netCents)}</ram:LineTotalAmount><ram:TaxBasisTotalAmount>${amount(data.netCents)}</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">${amount(data.taxCents)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${amount(data.grossCents)}</ram:GrandTotalAmount>${data.paidCents ? `<ram:TotalPrepaidAmount>${amount(data.paidCents)}</ram:TotalPrepaidAmount>` : ""}<ram:DuePayableAmount>${amount(data.grossCents - data.paidCents)}</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>`,
    "</ram:ApplicableHeaderTradeSettlement>",
    "</rsm:SupplyChainTradeTransaction>",
    "</rsm:CrossIndustryInvoice>",
  ].join("\n");
}
