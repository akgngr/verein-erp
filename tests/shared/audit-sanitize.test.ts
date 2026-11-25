import assert from "node:assert/strict";
import test from "node:test";

import { Prisma } from "@prisma/client";

import { sanitizeAuditValue } from "@/shared/audit/write-audit";

// #582: Denetim değişikliklerinde tarih ve tutarlar korunur; parola alanları atılır.
test("audit changes keep dates and decimals and drop password fields", () => {
  const result = sanitizeAuditValue({
    receivedAt: new Date("2030-02-10T00:00:00.000Z"),
    amount: new Prisma.Decimal("12.50"),
    nested: [{ dueAt: new Date("2030-03-01T12:00:00.000Z") }],
    password: "secret",
    invalid: new Date("not a date"),
  });
  assert.deepEqual(result, {
    receivedAt: "2030-02-10T00:00:00.000Z",
    amount: "12.5",
    nested: [{ dueAt: "2030-03-01T12:00:00.000Z" }],
    invalid: null,
  });
});
