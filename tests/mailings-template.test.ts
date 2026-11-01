import assert from "node:assert/strict";
import { test } from "node:test";

import { renderMailTemplate } from "../src/shared/mailings/define";

test("yer tutucular doldurulur, bilinmeyenler korunur", () => {
  assert.equal(renderMailTemplate("Hallo {firstName} {lastName} ({membershipNumber}) {unknown}", { firstName: "Anna", lastName: "Muster", membershipNumber: "UYE-2026-0007" }), "Hallo Anna Muster (UYE-2026-0007) {unknown}");
});
