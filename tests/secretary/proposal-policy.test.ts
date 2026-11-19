import assert from "node:assert/strict";
import { test } from "node:test";

import { isProposalExpired, requiresExternalConfirmation } from "@/modules/secretary/components/proposal-policy";

test("external proposals require explicit additional confirmation", () => {
  assert.equal(requiresExternalConfirmation("external"), true);
  assert.equal(requiresExternalConfirmation("internal"), false);
});

test("expired or malformed proposals are not actionable in the client", () => {
  const now = new Date("2026-11-19T09:00:00.000Z");
  assert.equal(isProposalExpired("2026-11-19T08:59:59.999Z", now), true);
  assert.equal(isProposalExpired("2026-11-19T09:00:00.000Z", now), true);
  assert.equal(isProposalExpired("invalid", now), true);
  assert.equal(isProposalExpired("2026-11-19T09:00:01.000Z", now), false);
});
