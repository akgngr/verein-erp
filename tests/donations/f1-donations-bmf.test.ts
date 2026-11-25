import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import { CONFIRMATION_RETENTION_YEARS } from "@/modules/donations/constants";
import { exemptionParagraph, USAGE_COLLECTIVE, USAGE_SINGLE } from "@/modules/donations/pdf/template-de";
import { donorCreateSchema } from "@/modules/donations/schemas/donor";
import { retentionEndDate, validateRecipientAddress } from "@/modules/donations/services/confirmation-rules";
import { confirmationIssuerSnapshotToPdf } from "@/modules/donations/services/issuer-snapshot";
import {
  formatNonBreakingTaxNumber,
  normalizeCharitablePurposes,
  normalizeRegisterCourtName,
  normalizeTaxOfficeName,
} from "@/shared/pdf/format";

test("F1-1: BMF wording and letterhead normalizers eliminate prefix duplication and keep StNr non-breaking", () => {
  assert.equal(normalizeTaxOfficeName("Finanzamt Berlin"), "Berlin");
  assert.equal(normalizeTaxOfficeName("Finanzamtes Köln-Nord"), "Köln-Nord");
  assert.equal(normalizeRegisterCourtName("Amtsgericht Charlottenburg"), "Charlottenburg");
  assert.equal(normalizeRegisterCourtName("AG München"), "München");
  assert.equal(normalizeCharitablePurposes("Förderung von Kunst und Kultur"), "von Kunst und Kultur");
  assert.equal(normalizeCharitablePurposes("zur Förderung der Jugendhilfe"), "der Jugendhilfe");
  assert.equal(formatNonBreakingTaxNumber("007 250 12345"), "StNr.\u00A0007\u00A0250\u00A012345");

  const para = exemptionParagraph({
    exemptionDocumentType: "EXEMPTION_NOTICE",
    purposes: "Förderung von Kunst und Kultur",
    taxOffice: "Finanzamt Berlin",
    taxNumber: "007 250 12345",
    noticeDate: "01.03.2025",
    period: "2022 bis 2024",
  });
  assert.equal(para.includes("Förderung Förderung"), false);
  assert.equal(para.includes("Finanzamtes Finanzamt"), false);
  assert.equal(para.includes("wegen Förderung von Kunst und Kultur"), true);
  assert.equal(para.includes("des Finanzamtes Berlin"), true);
  assert.equal(para.includes("StNr.\u00A0007\u00A0250\u00A012345"), true);

  assert.equal(USAGE_SINGLE("Förderung von Bildung").includes("Förderung Förderung"), false);
  assert.equal(USAGE_COLLECTIVE("Förderung der Jugendhilfe").includes("Förderung Förderung"), false);

  const para60a = exemptionParagraph({
    exemptionDocumentType: "SPECIAL_ASSESSMENT_60A",
    purposes: "Förderung der Jugendhilfe",
    taxOffice: "Finanzamt Hamburg",
    taxNumber: "17/400/12345",
    noticeDate: "15.01.2026",
    period: null,
  });
  assert.equal(para60a.includes("Finanzamt Finanzamt"), false);
  assert.equal(para60a.includes("Satzung Förderung"), false);
});

test("F1-2: § 50 Abs. 7 EStDV retention period is 10 years", () => {
  assert.equal(CONFIRMATION_RETENTION_YEARS, 10);
  const end = retentionEndDate(new Date("2026-06-15T10:00:00Z"));
  assert.equal(end.toISOString().slice(0, 10), "2036-12-31");
});

test("F1-3: stored single confirmation PDF snapshot injects confirmationNumber and issueDate", async () => {
  const issueDate = new Date("2026-04-10T12:00:00Z");
  const pdfData = await confirmationIssuerSnapshotToPdf({
    confirmationNumber: "ZB-2026-0007",
    issueDate,
    recipient: {
      kind: "donor",
      name: "Max Mustermann",
      street: "Musterstraße 1",
      postalCode: "10115",
      city: "Berlin",
      country: "Deutschland",
    },
    issuer: { name: "Testverein e.V.", city: "Berlin", membershipFeesDeductible: false },
    lang: "de",
    kind: "SINGLE",
    content: "DONATION",
    totalCents: 15_000,
    amountInWords: "einhundertfünfzig Euro",
    periodFrom: new Date("2026-04-01T00:00:00Z"),
    periodTo: new Date("2026-04-01T00:00:00Z"),
    waived: false,
    items: [],
  });
  assert.equal(pdfData.confirmationNumber, "ZB-2026-0007");
  assert.equal(pdfData.issueDate.getTime(), issueDate.getTime());
  assert.equal(pdfData.isPreview, false);
});

test("F1-4: validateRecipientAddress blocks blank address fields on MEMBERSHIP_FEE confirmations", () => {
  const missing = validateRecipientAddress({
    name: "Ali Yılmaz",
    street: "   ",
    postalCode: "10115",
    city: "Berlin",
    country: "Deutschland",
  });
  assert.equal(missing.ok, false);

  const valid = validateRecipientAddress({
    name: "Ali Yılmaz",
    street: "Hauptstr. 5",
    postalCode: "10115",
    city: "Berlin",
    country: "Deutschland",
  });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.street, "Hauptstr. 5");
});

test("F1-5: donor schema permits creating PERSON from copyFromMemberId without manual lastName and updateDonorAction uses string id", async () => {
  const parsed = donorCreateSchema.safeParse({
    type: "PERSON",
    firstName: "",
    lastName: "",
    organizationName: "",
    street: "",
    postalCode: "",
    city: "",
    country: "Deutschland",
    email: "",
    phone: "",
    note: "",
    copyFromMemberId: "UYE-0001",
  });
  assert.equal(parsed.success, true);

  const donorActionsSrc = await readFile(
    path.resolve(process.cwd(), "src/modules/donations/actions/donor-actions.ts"),
    "utf8",
  );
  assert.equal(donorActionsSrc.includes("id: donorCreateSchema.shape.type"), false);
  assert.equal(donorActionsSrc.includes("donorUpdateSchema.extend({ id: z.string().min(1) })"), true);
});
