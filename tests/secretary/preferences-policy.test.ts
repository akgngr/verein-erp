import assert from "node:assert/strict";
import { test } from "node:test";

import { validPreferences } from "@/modules/secretary/views/preferences-policy";

const base = {
  briefingEnabled: true,
  briefingTime: "07:30",
  quietFrom: "",
  quietTo: "",
  channels: ["in_app"] as ("in_app" | "email")[],
};

test("secretary preference form enforces times and paired quiet hours", () => {
  assert.equal(validPreferences(base), true);
  assert.equal(validPreferences({ ...base, briefingTime: "25:00" }), false);
  assert.equal(validPreferences({ ...base, quietFrom: "21:00", quietTo: "" }), false);
  assert.equal(validPreferences({ ...base, quietFrom: "21:00", quietTo: "07:00" }), true);
});

test("secretary channels are non-empty, known and non-duplicated", () => {
  assert.equal(validPreferences({ ...base, channels: [] }), false);
  assert.equal(validPreferences({ ...base, channels: ["in_app", "email"] }), true);
  assert.equal(validPreferences({ ...base, channels: ["email", "email"] }), false);
});
