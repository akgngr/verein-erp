import assert from "node:assert/strict";
import { test } from "node:test";

import { mailingVars, renderMailingTemplate } from "../src/modules/members/services/bulk-mail-template";

test("yer tutucular doldurulur, bilinmeyenler korunur", () => {
  const vars = mailingVars({ firstName: "Anna", lastName: "Muster", membershipNumber: "UYE-2026-0007" });
  assert.equal(renderMailingTemplate("Hallo {firstName} {lastName} ({membershipNumber}) {unknown}", vars), "Hallo Anna Muster (UYE-2026-0007) {unknown}");
  assert.equal(renderMailingTemplate("{fullName}", vars), "Anna Muster");
});
