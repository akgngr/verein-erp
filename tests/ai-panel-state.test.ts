import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { decodePanelState, encodePanelState } from "../src/modules/ai/panel-state";

describe("AI panel durumu (çerez)", () => {
  test("gidip gelir ve genişlik sınırlanır", () => {
    assert.deepEqual(decodePanelState(encodePanelState({ open: true, width: 512, conversationId: "clx1234567890" })), { open: true, width: 512, conversationId: "clx1234567890" });
    assert.equal(decodePanelState(encodePanelState({ open: false, width: 5000, conversationId: null })).width, 760);
  });
  test("bozuk veya eksik çerez güvenli varsayılana döner", () => {
    assert.deepEqual(decodePanelState(undefined), { open: false, width: 400, conversationId: null });
    assert.equal(decodePanelState("1|abc|<script>").conversationId, null);
  });
});
