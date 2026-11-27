import assert from "node:assert/strict";
import test from "node:test";

import {
  can,
  definePermissions,
  getActivePermissionPolicy,
  PermissionPolicyUnavailableError,
  refreshActivePermissionPolicy,
  registerPermissionPolicyLoader,
  setActivePermissionPolicy,
} from "@/shared/permissions/define";

// #582: Arka plan çalışanı politikayı kayıtlı yükleyiciyle tazeler; yükleyici yoksa fail closed.
const sample = definePermissions("sample", {
  ADMIN: ["view", "update"],
  BOARD: ["view"],
  SECRETARY: ["view"],
  TREASURER: ["view"],
  AUDITOR: ["view"],
  TAX_ADVISOR: [],
  TEACHER: [],
  VIEWER: ["view"],
});

test("refresh fails closed when no loader is registered", async () => {
  await assert.rejects(refreshActivePermissionPolicy(), PermissionPolicyUnavailableError);
});

test("refresh activates the loaded policy so can() sees DB overrides and custom roles", async () => {
  const previous = getActivePermissionPolicy();
  try {
    setActivePermissionPolicy(null);
    assert.equal(can("SECRETARY", sample, "update"), false);
    assert.equal(can("CUSTOM_KASSE", sample, "view"), false);

    registerPermissionPolicyLoader(async () => ({
      overrides: { SECRETARY: { sample: ["view", "update"] }, CUSTOM_KASSE: { sample: ["view"] }, VIEWER: { sample: [] } },
      unavailableRoles: [],
    }));
    await refreshActivePermissionPolicy();

    assert.equal(can("SECRETARY", sample, "update"), true, "override grants update");
    assert.equal(can("CUSTOM_KASSE", sample, "view"), true, "custom role is known");
    assert.equal(can("VIEWER", sample, "view"), false, "override revokes view");
  } finally {
    setActivePermissionPolicy(previous);
  }
});
