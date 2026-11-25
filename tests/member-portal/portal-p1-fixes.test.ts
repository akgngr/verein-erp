import assert from "node:assert/strict";
import test from "node:test";

import { memberSubjectRef, normalizeSubjectRef, parseSubjectRef } from "@/modules/member-portal/services/subject-ref";
import { isValidIban } from "@/modules/online-forms/lib/schemas";

// #580: Portal öznesi biçimi, IBAN Mod-97, sırların fail-closed davranışı (veritabanı gerektirmez).

test("subjectRef has one format and legacy bare ids are read as members", () => {
  assert.equal(memberSubjectRef("abc123def"), "member:abc123def");
  assert.deepEqual(parseSubjectRef("member:abc123def"), { kind: "member", id: "abc123def" });
  assert.deepEqual(parseSubjectRef("guardian:g1"), { kind: "guardian", id: "g1" });
  assert.deepEqual(parseSubjectRef("clxyz12345abcdef"), { kind: "member", id: "clxyz12345abcdef" }, "legacy session value");
  assert.equal(parseSubjectRef("admin:x"), null);
  assert.equal(parseSubjectRef("member:"), null);
  assert.equal(parseSubjectRef("short"), null);
  assert.equal(normalizeSubjectRef("clxyz12345abcdef"), "member:clxyz12345abcdef");
});

test("IBAN is validated with the ISO 13616 Mod-97 checksum", () => {
  assert.equal(isValidIban("DE89 3704 0044 0532 0130 00"), true);
  assert.equal(isValidIban("DE89370400440532013001"), false, "one wrong digit");
  assert.equal(isValidIban("GB82WEST12345698765432"), true);
  assert.equal(isValidIban("DE00"), false);
});

test("receipt and Art. 15 secrets fail closed without a configured key", async () => {
  const keys = ["PORTAL_RECEIPT_SECRET", "PORTAL_ART15_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    const { signReceiptRef } = await import("@/modules/member-portal/services/receipt-ref");
    const { encryptArt15Payload } = await import("@/modules/exports/services/art15-crypto");
    assert.throws(() => signReceiptRef({ kind: "dues", id: "x", subjectRef: "member:m1" }), /PORTAL_RECEIPT_SECRET_MISSING/);
    assert.throws(() => encryptArt15Payload("{}"), /PORTAL_ART15_SECRET_MISSING/);
    process.env.PORTAL_RECEIPT_SECRET = "r".repeat(32);
    assert.ok(signReceiptRef({ kind: "dues", id: "x", subjectRef: "member:m1" }));
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("signed member forms with bank details include the SEPA authorization", async () => {
  const { showsSepaConsent } = await import("@/modules/online-forms/lib/evidence-consents");
  assert.equal(showsSepaConsent({ guardian: {} }), true);
  assert.equal(showsSepaConsent({ member: { sepaMandate: true } }), true);
  assert.equal(showsSepaConsent({ member: { iban: "DE89 3704 0044 0532 0130 00" } }), true);
  assert.equal(showsSepaConsent({ member: { sepaMandate: false, iban: "" } }), false);
  assert.equal(showsSepaConsent({}), false);
});
