/** EI-3 görünüm ve PDF etiketleri (sunucuda çevrilip düz nesne olarak verilir). */
export const EINVOICE_VIEW_FIELDS = [
  "title", "number", "issueDate", "dueDate", "servicePeriod", "buyerReference", "orderReference", "precedingInvoice",
  "seller", "buyer", "vatId", "taxNumber", "contact", "notes", "lines", "position", "item", "quantity", "unitPrice", "rate", "net",
  "taxes", "category", "taxAmount", "exemption", "totalLines", "totalAllowance", "totalCharge", "totalNet", "totalTax", "totalGross",
  "totalPrepaid", "totalPayable", "payment", "means", "iban", "bic", "accountName", "reference", "terms", "mandate", "creditorId", "source",
] as const;

export type EInvoiceViewLabels = Record<(typeof EINVOICE_VIEW_FIELDS)[number], string> & { documentType: string; meansLabel: string | null };

const TYPES = ["380", "381", "384", "389", "326", "875", "876", "877"] as const;
const MEANS = ["10", "30", "42", "48", "49", "57", "58", "59"] as const;

/** next-intl çevirmeniyle etiketleri kurar (belge türü ve ödeme yolu kodları çözülür). */
export function buildEInvoiceViewLabels(
  t: (key: string, values?: Record<string, string>) => string,
  document: { typeCode: string | null; payment: { meansCode: string | null }; syntax: string },
  sha256: string | null,
): EInvoiceViewLabels {
  const labels = Object.fromEntries(EINVOICE_VIEW_FIELDS.map((field) => [field, t(`fields.${field}`)])) as Record<(typeof EINVOICE_VIEW_FIELDS)[number], string>;
  const type = document.typeCode ?? "";
  const means = document.payment.meansCode ?? "";
  return {
    ...labels,
    source: t("fields.source", { syntax: document.syntax, hash: sha256 ? sha256.slice(0, 16) : "—" }),
    documentType: (TYPES as readonly string[]).includes(type) ? t(`types.${type}`) : t("types.other", { code: type || "—" }),
    meansLabel: means ? ((MEANS as readonly string[]).includes(means) ? t(`means.${means}`) : t("means.other", { code: means })) : null,
  };
}
