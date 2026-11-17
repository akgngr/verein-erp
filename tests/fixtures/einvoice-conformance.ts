import type { XInvoiceData, XInvoiceParty } from "@/modules/accounting/services/einvoice-out";

/**
 * Synthetic fixtures for e-invoice conformance checks (KoSIT / Mustang / veraPDF).
 * No real persons or organisations: names, addresses and IDs are invented; IBANs are public test IBANs.
 */
const seller: XInvoiceParty = {
  name: "Musterverein Beispielstadt e.V.",
  street: "Vereinsweg 1",
  postalCode: "10115",
  city: "Berlin",
  countryCode: "DE",
  vatId: "DE123456789",
  taxNumber: "27/123/45678",
  email: "kasse@musterverein.example",
  phone: "+49 30 1234567",
  contactName: "Kassenwart",
};

const buyer: XInvoiceParty = {
  name: "Beispiel Kunde GmbH",
  street: "Kundenstraße 5",
  postalCode: "80331",
  city: "München",
  countryCode: "DE",
  vatId: "DE987654321",
  taxNumber: null,
  email: "rechnung@kunde.example",
  phone: null,
  contactName: null,
};

const base: XInvoiceData = {
  number: "R-2026-0042",
  issueDate: "2026-10-01",
  dueDate: "2026-10-15",
  serviceDate: "September 2026",
  buyerReference: "04011000-12345-34",
  currency: "EUR",
  seller,
  buyer,
  iban: "DE02120300000000202051",
  bic: "BYLADEM1001",
  paymentTerms: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
  note: null,
  smallBusiness: false,
  lines: [
    { position: 1, description: "Hallenmiete Oktober", quantity: 2, unit: "h", unitPriceCents: 5000, netCents: 10000, taxRate: 19 },
    { position: 2, description: "Festschrift (Buch)", quantity: 1, unit: null, unitPriceCents: 5000, netCents: 5000, taxRate: 7 },
  ],
  byRate: [{ rate: 19, netCents: 10000, taxCents: 1900 }, { rate: 7, netCents: 5000, taxCents: 350 }],
  netCents: 15000,
  taxCents: 2250,
  grossCents: 17250,
  paidCents: 0,
};

export const EINVOICE_FIXTURES: Record<string, XInvoiceData> = {
  /** Standard invoice, two VAT rates (19 % / 7 %). */
  standard: base,
  /** Partially paid invoice (BT-113 prepaid amount). */
  "partially-paid": { ...base, number: "R-2026-0043", paidCents: 7250 },
  /** Kleinunternehmer § 19 UStG: no VAT (category E with exemption reason). */
  "small-business": {
    ...base,
    number: "R-2026-0044",
    smallBusiness: true,
    seller: { ...seller, vatId: null, legalRegistration: "VR 12345 B" },
    lines: [{ position: 1, description: "Übungsleiterstunden", quantity: 10, unit: "h", unitPriceCents: 2500, netCents: 25000, taxRate: 0 }],
    byRate: [{ rate: 0, netCents: 25000, taxCents: 0 }],
    netCents: 25000,
    taxCents: 0,
    grossCents: 25000,
  },
  /** Cancellation invoice (type code 381) referencing the original invoice. */
  "credit-note": {
    ...base,
    number: "ST-2026-0001",
    typeCode: 381,
    precedingInvoice: { number: "R-2026-0042", issueDate: "2026-10-01" },
  },
};
