import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { donorCreateSchema, donorUpdateSchema } from "../src/modules/donations/schemas/donor";
import { issueConfirmationSchema } from "../src/modules/donations/schemas/confirmation";

/** Bağışçı formunun gönderdiği değerler (formda memberId alanı yoktur). */
const formValues = {
  type: "PERSON",
  firstName: "Ayşe",
  lastName: "Yılmaz",
  organizationName: "",
  street: "",
  postalCode: "",
  city: "",
  country: "Deutschland",
  email: "",
  phone: "",
  note: "",
  copyFromMemberId: "",
};

describe("Bağışçı şeması", () => {
  test("formun gönderdiği değerler (memberId olmadan) geçerlidir", () => {
    const result = donorCreateSchema.safeParse(formValues);
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    assert.equal(donorUpdateSchema.safeParse({ ...formValues, id: "x", isActive: true }).success, true);
  });

  test("kişi için soyad zorunludur", () => {
    const result = donorCreateSchema.safeParse({ ...formValues, lastName: "" });
    assert.equal(result.success, false);
    assert.deepEqual(result.error?.issues.map((issue) => issue.path.join(".")), ["lastName"]);
  });
});

describe("issueConfirmationSchema", () => {
  // Regresyon: discriminatedUnion("kind") aidat şemasındaki "SINGLE" ile çakışıp
  // her çağrıda "Duplicate discriminator value" fırlatıyordu (hiçbir bildirim üretilemiyordu).
  test("accepts single donation, collective donation and membership fee inputs", () => {
    assert.equal(
      issueConfirmationSchema.safeParse({ kind: "SINGLE", content: "DONATION", donationId: "d1" }).success,
      true,
    );
    assert.equal(
      issueConfirmationSchema.safeParse({
        kind: "COLLECTIVE",
        content: "DONATION",
        donorId: "p1",
        periodFrom: "2026-01-01",
        periodTo: "2026-12-31",
        donationIds: ["d1", "d2"],
      }).success,
      true,
    );
    assert.equal(
      issueConfirmationSchema.safeParse({ kind: "SINGLE", content: "MEMBERSHIP_FEE", memberId: "m1", year: 2026 })
        .success,
      true,
    );
  });

  test("rejects a collective donation without selected donations", () => {
    const result = issueConfirmationSchema.safeParse({
      kind: "COLLECTIVE",
      content: "DONATION",
      donorId: "p1",
      periodFrom: "2026-01-01",
      periodTo: "2026-12-31",
      donationIds: [],
    });
    assert.equal(result.success, false);
  });
});
