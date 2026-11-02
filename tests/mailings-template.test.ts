import assert from "node:assert/strict";
import { test } from "node:test";

import { renderMailTemplate } from "../src/shared/mailings/define";

test("yer tutucular doldurulur, bilinmeyenler korunur", () => {
  assert.equal(renderMailTemplate("Hallo {firstName} {lastName} ({membershipNumber}) {unknown}", { firstName: "Anna", lastName: "Muster", membershipNumber: "UYE-2026-0007" }), "Hallo Anna Muster (UYE-2026-0007) {unknown}");
});

test("HTML gövdede değerler kaçışlanır (enjeksiyon yok)", async () => {
  const { renderMailTemplateHtml } = await import("../src/shared/mailings/define");
  assert.equal(renderMailTemplateHtml("<p>Hallo {firstName}</p>", { firstName: '<img src=x onerror="a">' }), "<p>Hallo &lt;img src=x onerror=&quot;a&quot;&gt;</p>");
  assert.equal(renderMailTemplateHtml("<p>{unknown}</p>", {}), "<p>{unknown}</p>");
});
