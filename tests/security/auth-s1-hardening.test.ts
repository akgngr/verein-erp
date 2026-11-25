import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { changePasswordSchema } from "@/modules/auth/schemas/change-password";
import { profileSchema } from "@/modules/auth/schemas/profile";
import { computeSessionVersion, isSessionVersionValid } from "@/modules/auth/services/session-version";

describe("Pre-Live S1 Auth Hardening (#572)", () => {
  test("sessionVersion changes when passwordHash changes and rejects missing/stale tokens", () => {
    const secret = "test-secret-key-for-session-version";
    const v1 = computeSessionVersion("$2a$12$hash-one-example", secret);
    const v2 = computeSessionVersion("$2a$12$hash-two-example", secret);
    assert.notEqual(v1, v2);
    assert.equal(isSessionVersionValid(v1, "$2a$12$hash-one-example", secret), true);
    assert.equal(isSessionVersionValid(v1, "$2a$12$hash-two-example", secret), false);
    assert.equal(isSessionVersionValid(undefined, "$2a$12$hash-one-example", secret), false);
    assert.equal(isSessionVersionValid("", "$2a$12$hash-one-example", secret), false);
  });

  test("changePasswordSchema rejects reusing current password and mismatched confirmPassword", () => {
    const same = changePasswordSchema.safeParse({
      currentPassword: "Password1234",
      newPassword: "Password1234",
      confirmPassword: "Password1234",
    });
    assert.equal(same.success, false);
    assert.ok(same.error.issues.some((i) => i.message === "auth.errors.samePassword"));

    const mismatch = changePasswordSchema.safeParse({
      currentPassword: "Password1234",
      newPassword: "NewPassword567",
      confirmPassword: "Different567",
    });
    assert.equal(mismatch.success, false);
    assert.ok(mismatch.error.issues.some((i) => i.message === "auth.validation.passwordsMismatch"));

    const ok = changePasswordSchema.safeParse({
      currentPassword: "Password1234",
      newPassword: "NewPassword567",
      confirmPassword: "NewPassword567",
    });
    assert.equal(ok.success, true);
  });

  test("profileSchema accepts lowercase ISO-2 country code", () => {
    const res = profileSchema.safeParse({
      phone: "",
      mobile: "",
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: "de",
      accountHolder: "",
      iban: "",
      clearIban: false,
      bic: "",
      bankName: "",
      businessName: "",
      taxNumber: "",
      clearTaxNumber: false,
      vatId: "",
      isSmallBusiness: false,
    });
    assert.equal(res.success, true);
  });
});
