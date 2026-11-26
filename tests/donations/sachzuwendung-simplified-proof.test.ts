import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CONFIRMATION_CONTENT_VALUES,
  DONATION_METHOD_VALUES,
  IN_KIND_METHOD,
  IN_KIND_ORIGIN_VALUES,
  SMALL_DONATION_LIMIT_CENTS,
} from "@/modules/donations/constants";
import {
  IN_KIND_ORIGIN_BUSINESS,
  IN_KIND_ORIGIN_PRIVATE,
  IN_KIND_ORIGIN_UNKNOWN,
  IN_KIND_VALUATION_RECORDS_NO,
  IN_KIND_VALUATION_RECORDS_YES,
  LABEL_IN_KIND_ITEM,
  LABEL_IN_KIND_VALUE_DIGITS,
  SIMPLIFIED_PROOF_DISCLAIMER,
  SIMPLIFIED_PROOF_SUBTITLE,
  SIMPLIFIED_PROOF_TITLE,
  SIMPLIFIED_PROOF_USAGE,
  TEMPLATE_VERSION,
  TITLE_SINGLE_IN_KIND,
} from "@/modules/donations/pdf/template-de";
import {
  donationCreateSchema,
  donationUpdateSchema,
} from "@/modules/donations/schemas/donation";

test("Sachzuwendung constants and bumped TEMPLATE_VERSION are registered", () => {
  assert.ok(DONATION_METHOD_VALUES.includes("IN_KIND"));
  assert.equal(IN_KIND_METHOD, "IN_KIND");
  assert.ok(CONFIRMATION_CONTENT_VALUES.includes("IN_KIND_DONATION"));
  assert.deepEqual([...IN_KIND_ORIGIN_VALUES], [
    "BUSINESS_ASSETS",
    "PRIVATE_ASSETS",
    "UNKNOWN",
  ]);
  assert.equal(SMALL_DONATION_LIMIT_CENTS, 30_000);
  assert.ok(TEMPLATE_VERSION.includes("Sach"));
});

test("BMF Sachzuwendung and § 50 Abs. 4 Nr. 2 EStDV simplified proof templates contain statutory wording", () => {
  assert.equal(TITLE_SINGLE_IN_KIND, "Bestätigung über Sachzuwendungen");
  assert.ok(LABEL_IN_KIND_VALUE_DIGITS.includes("Wert der Zuwendung"));
  assert.ok(LABEL_IN_KIND_ITEM.includes("Genaue Bezeichnung"));
  assert.ok(IN_KIND_ORIGIN_BUSINESS.includes("Betriebsvermögen"));
  assert.ok(IN_KIND_ORIGIN_PRIVATE.includes("Privatvermögen"));
  assert.ok(IN_KIND_ORIGIN_UNKNOWN.includes("keine Angaben"));
  assert.ok(IN_KIND_VALUATION_RECORDS_YES.includes("Wertermittlung"));
  assert.ok(IN_KIND_VALUATION_RECORDS_NO.includes("Wertermittlung"));

  assert.equal(SIMPLIFIED_PROOF_TITLE, "Vereinfachter Spendennachweis");
  assert.ok(SIMPLIFIED_PROOF_SUBTITLE.includes("§ 50 Abs. 4"));
  assert.ok(SIMPLIFIED_PROOF_SUBTITLE.includes("300,00 €"));
  assert.ok(SIMPLIFIED_PROOF_USAGE.includes("Buchungsbestätigung"));
  assert.ok(SIMPLIFIED_PROOF_DISCLAIMER.includes("Sachzuwendungen"));
});

test("donationCreateSchema validates IN_KIND Sachzuwendung fields and forbids Aufwandsspende", () => {
  const validInKind = donationCreateSchema.safeParse({
    donorId: "donor-1",
    receivedAt: "2026-10-15",
    amount: "450,00",
    method: "IN_KIND",
    reference: "",
    purposeNote: "Jugendarbeit",
    itemDescription: "Laptop Lenovo ThinkPad T14 (Baujahr 2024, neuwertig)",
    inKindOrigin: "PRIVATE_ASSETS",
    valuationRecordsAvailable: true,
    waivedReimbursement: false,
    claimBasis: "",
    waiverDeclaredAt: "",
    expenseCategoryId: "",
  });
  assert.equal(validInKind.success, true);

  // Missing itemDescription must fail
  const missingDescription = donationCreateSchema.safeParse({
    donorId: "donor-1",
    receivedAt: "2026-10-15",
    amount: "450,00",
    method: "IN_KIND",
    reference: "",
    purposeNote: "",
    itemDescription: "",
    inKindOrigin: "PRIVATE_ASSETS",
    valuationRecordsAvailable: false,
    waivedReimbursement: false,
    claimBasis: "",
    waiverDeclaredAt: "",
    expenseCategoryId: "",
  });
  assert.equal(missingDescription.success, false);

  // Missing inKindOrigin must fail
  const missingOrigin = donationCreateSchema.safeParse({
    donorId: "donor-1",
    receivedAt: "2026-10-15",
    amount: "450,00",
    method: "IN_KIND",
    reference: "",
    purposeNote: "",
    itemDescription: "Beamer Epson Full-HD (neuwertig)",
    inKindOrigin: "",
    valuationRecordsAvailable: false,
    waivedReimbursement: false,
    claimBasis: "",
    waiverDeclaredAt: "",
    expenseCategoryId: "",
  });
  assert.equal(missingOrigin.success, false);

  // IN_KIND + waivedReimbursement must fail
  const inKindWithWaiver = donationCreateSchema.safeParse({
    donorId: "donor-1",
    receivedAt: "2026-10-15",
    amount: "450,00",
    method: "IN_KIND",
    reference: "",
    purposeNote: "",
    itemDescription: "Beamer Epson Full-HD (neuwertig)",
    inKindOrigin: "BUSINESS_ASSETS",
    valuationRecordsAvailable: true,
    waivedReimbursement: true,
    claimBasis: "Vorstandsbeschluss",
    waiverDeclaredAt: "2026-10-15",
    expenseCategoryId: "cat-1",
  });
  assert.equal(inKindWithWaiver.success, false);
});

test("donationUpdateSchema enforces IN_KIND business rules identically", () => {
  const invalidUpdate = donationUpdateSchema.safeParse({
    id: "don-1",
    updatedAt: "2026-10-15T10:00:00.000Z",
    receivedAt: "2026-10-15",
    amount: "200,00",
    method: "IN_KIND",
    reference: "",
    purposeNote: "",
    itemDescription: "Kurz",
    inKindOrigin: "UNKNOWN",
    valuationRecordsAvailable: false,
    waivedReimbursement: false,
    claimBasis: "",
    waiverDeclaredAt: "",
    expenseCategoryId: "",
  });
  assert.equal(invalidUpdate.success, false);
});
