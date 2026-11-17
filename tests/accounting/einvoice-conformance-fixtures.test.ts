import assert from "node:assert/strict";
import { test } from "node:test";

import { validateOutgoing } from "@/modules/accounting/services/einvoice-validate";

import { EINVOICE_FIXTURES } from "../fixtures/einvoice-conformance";

// The external conformance workflow (Mustang + KoSIT) validates these fixtures; the in-app validator must
// agree that they are error-free, otherwise the app would refuse to export them.
test("e-invoice conformance fixtures pass the in-app validator", () => {
  for (const [name, data] of Object.entries(EINVOICE_FIXTURES)) {
    const errors = validateOutgoing(data).filter((issue) => issue.severity === "error");
    assert.deepEqual(errors, [], name);
  }
});
