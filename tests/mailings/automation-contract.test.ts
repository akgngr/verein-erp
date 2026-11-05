import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { sendCampaignTask } from "@/modules/mailings/automation";

describe("Mailings automation task contract", () => {
  test("accepts only a campaign identifier and rejects recipient data", () => {
    assert.deepEqual(sendCampaignTask.inputSchema.parse({ campaignId: "campaign-1" }), {
      campaignId: "campaign-1",
    });

    assert.equal(sendCampaignTask.inputSchema.safeParse({
      campaignId: "campaign-1",
      recipients: [{ email: "person@example.org" }],
    }).success, false);
  });

  test("uses a stable idempotency key for a campaign", () => {
    assert.equal(
      sendCampaignTask.idempotencyKey?.({ campaignId: "campaign-1" }),
      "mailings:campaign:campaign-1",
    );
  });

  test("registers a versioned, bounded worker task", () => {
    assert.equal(sendCampaignTask.key, "mailings.send_campaign");
    assert.equal(sendCampaignTask.version, 1);
    assert.equal(sendCampaignTask.timeoutSeconds, 3600);
  });
});
