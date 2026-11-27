import assert from "node:assert/strict";
import test from "node:test";

import { refreshActivePermissionPolicy } from "@/shared/permissions/define";

// #582: Arka plan çalışanının izin politikası (veritabanı gerektirir).
const enabled = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET);

test("automation worker: the task registry registers the users policy loader", { skip: !enabled }, async () => {
  await import("@/modules/automation/tasks/registry");
  const policy = await refreshActivePermissionPolicy();
  assert.ok(Array.isArray(policy.unavailableRoles));
  assert.equal(typeof policy.overrides, "object");
});
