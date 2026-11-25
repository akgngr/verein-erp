import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { buildCiiInvoice } from "@/modules/accounting/services/einvoice-cii";
import { parseEInvoice, section14Checks } from "@/modules/accounting/services/einvoice-in";
import { buildXRechnungUbl, type XInvoiceData } from "@/modules/accounting/services/einvoice-out";
import { validateIncoming, validateOutgoing } from "@/modules/accounting/services/einvoice-validate";
import { gdpduIndex } from "@/modules/accounting/services/gdpdu";
import { buildPain001, sepaText } from "@/modules/accounting/services/sepa";
import { computeEuer, computeUstva, type TaxBookingRow } from "@/modules/accounting/services/tax-reports";
import { computeTreasurerReport } from "@/modules/accounting/services/treasurer-report";

const makeRow = (overrides: Partial<TaxBookingRow>): TaxBookingRow => ({
  id: "b1",
  bookingNumber: "2026-0001",
  type: "EXPENSE",
  bookingDate: new Date("2026-03-01T00:00:00Z"),
  description: "Test",
  receiptReference: null,
  amountCents: 119000,
  netCents: 100000,
  taxCents: 19000,
  taxRate: 19,
  accountNumber: "1200",
  accountName: "Bank",
  counterAccountNumber: null,
  counterAccountName: null,
  categoryId: "cat-1",
  categoryName: "Anschaffung",
  categoryNumber: "0420",
  ...overrides,
});

test("EÜR keeps paid Vorsteuer on asset acquisitions excluded from direct operating expenses (#576)", () => {
  const assetPurchase = makeRow({ id: "asset-booking", categoryId: "cat-asset", netCents: 100000, taxCents: 19000, amountCents: 119000 });
  const regularExpense = makeRow({ id: "exp-1", categoryId: "cat-opex", netCents: 20000, taxCents: 3800, amountCents: 23800 });
  const euer = computeEuer([assetPurchase, regularExpense], {
    assetCategoryIds: new Set(["cat-asset"]),
    nonCash: [{ key: "afa", cents: 20000 }],
  });
  // Direct operating expense excludes the 1000 EUR asset net (depreciated via AfA instead),
  // but Vorsteuer (190 EUR + 38 EUR = 228 EUR) is fully deductible in the year of purchase!
  assert.equal(euer.expenseNetCents, 40000);
  assert.equal(euer.inputTaxCents, 22800);
  assert.equal(euer.resultCents, -(40000 + 22800));
});

test("UStVA properly subtracts signed SOLL credit notes using Math.trunc (#576)", () => {
  const invoice = makeRow({
    id: "inv:1:19",
    type: "INCOME",
    netCents: 100000,
    taxCents: 19000,
    amountCents: 119000,
    taxRate: 19,
  });
  const creditNote = makeRow({
    id: "inv:2:19",
    type: "INCOME",
    netCents: -25050,
    taxCents: -4760,
    amountCents: -29810,
    taxRate: 19,
  });
  const ustva = computeUstva([invoice, creditNote]);
  // 1000.00 - 250.50 = 749.50 -> Math.trunc = 749 EUR -> 749 * 19% = 142.31 EUR = 14231 cents
  assert.equal(ustva.kz81BaseEuros, 749);
  assert.equal(ustva.kz81TaxCents, 14231);
  assert.equal(ustva.kz83Cents, 14231);

  // Net negative period (credit note > invoice): -250.50 -> Math.trunc = -250 (not -251)
  const onlyCredit = computeUstva([creditNote]);
  assert.equal(onlyCredit.kz81BaseEuros, -250);
  assert.equal(onlyCredit.kz81TaxCents, -4750);
});

test("GDPdU index.xml emits <UTF8/> encoding tag inside <Table> (#576)", () => {
  const xml = gdpduIndex({
    supplierName: "Test Verein e.V.",
    location: "Berlin",
    comment: "GoBD Export",
    mediaName: "2026",
    from: "2026-01-01",
    to: "2026-12-31",
    tables: [
      {
        file: "journal.csv",
        name: "Journal",
        description: "Buchungen",
        primaryKey: "Beleg",
        columns: [{ name: "Beleg", description: "Belegnummer", type: "AlphaNumeric" }],
        rows: [],
      },
    ],
  });
  assert.match(xml, /<Table>[\s\S]*<UTF8\/>[\s\S]*<VariableLength>/);
});

test("computeTreasurerReport exposes real previousYearIncomeCents and previousYearExpenseCents (#576)", () => {
  const report = computeTreasurerReport({
    year: 2026,
    bookings: [
      { id: "1", year: 2026, type: "INCOME", amountCents: 500000, sphere: "IDEELL", projectId: null },
      { id: "2", year: 2026, type: "EXPENSE", amountCents: 300000, sphere: "IDEELL", projectId: null },
    ],
    previousYearBookings: [
      { id: "p1", year: 2025, type: "INCOME", amountCents: 420000, sphere: "IDEELL", projectId: null },
      { id: "p2", year: 2025, type: "EXPENSE", amountCents: 380000, sphere: "IDEELL", projectId: null },
    ],
    accounts: [{ id: "a1", name: "Bank", openingCents: 100000, closingCents: 300000 }],
    projects: [],
  });
  assert.equal(report.totals.totalIncomeCents, 500000);
  assert.equal(report.totals.totalExpenseCents, 300000);
  assert.equal(report.totals.previousYearIncomeCents, 420000);
  assert.equal(report.totals.previousYearExpenseCents, 380000);
  assert.equal(report.totals.previousYearSurplusCents, 40000);
  assert.equal(report.totals.netAnnualSurplusCents, 200000);
});

test("incoming UBL and CII credit notes keep isCreditNote=true and negative signed amounts (#576)", () => {
  const party = {
    name: "Verein e.V.",
    street: "Hauptstr. 1",
    postalCode: "10115",
    city: "Berlin",
    countryCode: "DE",
    vatId: "DE123456789",
    taxNumber: "12/345/67890",
    email: "info@verein.de",
    phone: "030 123",
    contactName: "Kasse",
  };
  const credit: XInvoiceData = {
    number: "ST-2026-0001",
    issueDate: "2026-10-01",
    dueDate: null,
    serviceDate: "September 2026",
    buyerReference: "REF-1",
    currency: "EUR",
    seller: party,
    buyer: { ...party, name: "Kunde GmbH", vatId: null, taxNumber: null, email: "kunde@example.de", phone: null, contactName: null },
    iban: "DE02120300000000202051",
    bic: null,
    paymentTerms: null,
    note: null,
    smallBusiness: false,
    lines: [{ position: 1, description: "Storno", quantity: 1, unit: "Std", unitPriceCents: 30000, netCents: 30000, taxRate: 19 }],
    byRate: [{ rate: 19, netCents: 30000, taxCents: 5700 }],
    netCents: 30000,
    taxCents: 5700,
    grossCents: 35700,
    paidCents: 0,
    typeCode: 381,
    precedingInvoice: { number: "R-2026-0001", issueDate: "2026-09-15" },
  };

  for (const xml of [buildXRechnungUbl(credit), buildCiiInvoice(credit)]) {
    const parsed = parseEInvoice(xml);
    assert.equal(parsed.isCreditNote, true);
    assert.equal(parsed.netCents, -30000);
    assert.equal(parsed.taxCents, -5700);
    assert.equal(parsed.grossCents, -35700);
    assert.equal(parsed.payableCents, -35700);
    assert.deepEqual(validateIncoming(parsed), []);
    // -357 EUR has abs > 250 EUR, so NOT Kleinbetragsrechnung (requires tax ID, number, serviceDate)
    const checks = section14Checks({ ...parsed, sellerVatId: null, sellerTaxNumber: null, number: null, serviceDate: null });
    assert.equal(checks.find((c) => c.key === "sellerTaxId")?.ok, false);
  }
});

test("outgoing 0% VAT non-small-business invoices use TaxCategory E with exemption reason (never Z) (#576)", () => {
  const party = {
    name: "Verein e.V.",
    street: "Hauptstr. 1",
    postalCode: "10115",
    city: "Berlin",
    countryCode: "DE",
    vatId: "DE123456789",
    taxNumber: "12/345/67890",
    email: "info@verein.de",
    phone: "030 123",
    contactName: "Kasse",
  };
  const exemptInvoice: XInvoiceData = {
    number: "R-2026-0010",
    issueDate: "2026-10-01",
    dueDate: "2026-10-15",
    serviceDate: "Oktober 2026",
    buyerReference: "REF-10",
    currency: "EUR",
    seller: party,
    buyer: { ...party, name: "Kunde GmbH", vatId: null, taxNumber: null, email: "kunde@example.de", phone: null, contactName: null },
    iban: "DE02120300000000202051",
    bic: null,
    paymentTerms: null,
    note: null,
    smallBusiness: false,
    lines: [{ position: 1, description: "Bildungskurs § 4 Nr. 22 UStG", quantity: 1, unit: "Std", unitPriceCents: 10000, netCents: 10000, taxRate: 0 }],
    byRate: [{ rate: 0, netCents: 10000, taxCents: 0 }],
    netCents: 10000,
    taxCents: 0,
    grossCents: 10000,
    paidCents: 0,
  };
  assert.deepEqual(validateOutgoing(exemptInvoice), []);
  const ubl = buildXRechnungUbl(exemptInvoice);
  assert.match(ubl, /<cbc:ID>E<\/cbc:ID><cbc:Percent>0<\/cbc:Percent><cbc:TaxExemptionReason>Nicht steuerbar/);
  assert.doesNotMatch(ubl, /<cbc:ID>Z<\/cbc:ID>/);
  const cii = buildCiiInvoice(exemptInvoice);
  assert.match(cii, /<ram:CategoryCode>E<\/ram:CategoryCode>/);
  assert.match(cii, /<ram:ExemptionReason>Nicht steuerbar/);
  assert.doesNotMatch(cii, /<ram:CategoryCode>Z<\/ram:CategoryCode>/);
});

test("SEPA pain.001 transliterates Turkish chars and rejects empty names / fills empty remittance (#576)", () => {
  assert.equal(sepaText("Işık Çakır Öğün İstanbul Şirketi", 70), "Isik Cakir Oeguen Istanbul Sirketi");
  const xml = buildPain001({
    messageId: "ZL-2026-1",
    createdAt: new Date("2026-10-01T10:00:00Z"),
    executionDate: "2026-10-05",
    debtor: { name: "Kültür Derneği İstanbul", iban: "DE89370400440532013000", bic: null },
    payments: [
      {
        endToEndId: "E2E-1",
        amountCents: 15000,
        creditorName: "Işık Şahin",
        creditorIban: "DE02120300000000202051",
        creditorBic: null,
        remittance: "   ",
      },
    ],
  });
  assert.match(xml, /<InitgPty><Nm>Kueltuer Dernegi Istanbul<\/Nm><\/InitgPty>/);
  assert.match(xml, /<Cdtr><Nm>Isik Sahin<\/Nm><\/Cdtr>/);
  assert.match(xml, /<RmtInf><Ustrd>Rechnung<\/Ustrd><\/RmtInf>/);

  assert.throws(() =>
    buildPain001({
      messageId: "ZL-2026-2",
      createdAt: new Date("2026-10-01T10:00:00Z"),
      executionDate: "2026-10-05",
      debtor: { name: "—", iban: "DE89370400440532013000", bic: null },
      payments: [],
    }),
  );
});

test("structural guards for Kassenminus, GoBD, year closing, audit room, and project bookings (#576)", () => {
  const bookingActions = readFileSync("src/modules/accounting/actions/booking-actions.ts", "utf8");
  assert.match(bookingActions, /affectedAccounts/);
  assert.match(bookingActions, /assertNoNegativeCash/);

  const accountActions = readFileSync("src/modules/accounting/actions/account-actions.ts", "utf8");
  assert.match(accountActions, /assertNoNegativeCash/);

  const yearActions = readFileSync("src/modules/accounting/actions/year-actions.ts", "utf8");
  assert.match(yearActions, /yearNotFinished/);
  assert.match(yearActions, /getGobdStatus/);
  assert.match(yearActions, /YEAR_UNLOCK/);
  assert.match(yearActions, /unlockRequiresOtherApprover/);

  const auditRoom = readFileSync("src/modules/accounting/services/audit-room.ts", "utf8");
  assert.match(auditRoom, /kind:\s*"INVOICE"/);

  const projectBookings = readFileSync("src/modules/accounting/queries/project-bookings.ts", "utf8");
  assert.match(projectBookings, /deletedAt:\s*null/);

  const slideView = readFileSync("src/modules/accounting/views/treasurer-report-slide-view.tsx", "utf8");
  assert.match(slideView, /previousYearIncomeCents/);
  assert.match(slideView, /previousYearExpenseCents/);
});
