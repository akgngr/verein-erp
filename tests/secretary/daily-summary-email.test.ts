import assert from "node:assert/strict";
import { test } from "node:test";

import { renderSecretaryDailySummary } from "@/modules/secretary/emails/daily-summary";

test("daily email includes counts/link but never user-supplied details", () => {
  const digest = { date: "2026-11-19", total: 3, danger: 1, warning: 2 };
  for (const locale of ["tr", "de"] as const) {
    const email = renderSecretaryDailySummary(digest, locale, "https://erp.example.org");
    assert.ok(email.text.includes("https://erp.example.org/sekreter"));
    assert.ok(email.text.includes("3"));
    assert.ok(!email.text.includes("amount"));
    assert.ok(!email.text.includes("name"));
    assert.ok(!email.text.includes("email"));
    assert.ok(!email.html.includes("<script"));
  }
});

test("email uses trusted origins; invalid date and non-HTTPS URL fail", () => {
  assert.throws(() => renderSecretaryDailySummary({ date: "bad", total: 1, danger: 0, warning: 0 }, "tr", "https://erp.example.org"));
  assert.throws(() => renderSecretaryDailySummary({ date: "2026-11-19", total: 1, danger: 0, warning: 0 }, "tr", "http://outside.example.org"));
});
