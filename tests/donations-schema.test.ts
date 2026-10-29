import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { donorCreateSchema, donorUpdateSchema } from "../src/modules/donations/schemas/donor";

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
