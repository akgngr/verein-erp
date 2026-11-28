import assert from "node:assert/strict";
import { test } from "node:test";

import { splitForChannel } from "@/shared/campaigns/channel";
import type { Recipient } from "@/shared/mailings/define";

const row = (id: string, email: string | null, phone: string | null, consents: Record<string, boolean> = {}, optOut = false): Recipient => ({
  id,
  email,
  phone,
  consents,
  name: id,
  optOut,
  vars: {},
});

const email = { address: (r: Recipient) => r.email ?? null, allowed: (r: Recipient) => !r.optOut };
const sms = { address: (r: Recipient) => r.phone ?? null, allowed: (r: Recipient) => r.consents?.sms === true };

test("one message per channel address: a shared family inbox receives the campaign once", () => {
  const list = [row("g1", "Family@Example.org", null), row("g2", " family@example.org ", "+4915100000002", { sms: true })];
  const result = splitForChannel(email, list);
  assert.deepEqual(result.eligible.map((r) => r.id), ["g1"]);
  assert.equal(result.duplicates, 1);
  assert.equal(result.noAddress, 0);
  assert.equal(result.optOut, 0);
});

test("deduplication runs after eligibility: an opted-out first recipient does not block the next one", () => {
  const list = [row("g1", "family@example.org", null, {}, true), row("g2", "family@example.org", null)];
  const result = splitForChannel(email, list);
  assert.deepEqual(result.eligible.map((r) => r.id), ["g2"]);
  assert.equal(result.optOut, 1);
  assert.equal(result.duplicates, 0);
});

test("guardians sharing an email keep separate phones on SMS", () => {
  const list = [row("g1", "family@example.org", null), row("g2", "family@example.org", "+4915100000002", { sms: true })];
  const result = splitForChannel(sms, list);
  assert.deepEqual(result.eligible.map((r) => r.id), ["g2"]);
  assert.equal(result.noAddress, 1);
});
