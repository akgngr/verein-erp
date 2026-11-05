import test from "node:test";
import assert from "node:assert/strict";

test("mailing campaign service can be imported by the Node worker without Next navigation modules", async () => {
  const service = await import("@/modules/mailings/services/campaigns");
  assert.equal(typeof service.processCampaign, "function");
});
