import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRuntimeChecks, type RuntimeSnapshot } from "@/modules/security-monitor/services/runtime-checks";

// #585: Güvenlik izleme süreç içi denetimleri (alt süreç/test paketi yok).
const healthy: RuntimeSnapshot = {
  nodeEnv: "production",
  authSecret: "x".repeat(48),
  canEncryptSecrets: true,
  appUrl: "https://verein.example.org",
  uploadDir: "./storage/uploads",
  cwd: "/app",
  auditTriggers: ["audit_log_no_update", "audit_log_no_delete"],
  failedMigrations: 0,
};
const statusOf = (snapshot: RuntimeSnapshot) => Object.fromEntries(evaluateRuntimeChecks(snapshot).map((item) => [item.key, item.status]));

test("a hardened production install passes every check", () => {
  assert.ok(Object.values(statusOf(healthy)).every((status) => status === "pass"));
});

test("weak secrets, plain HTTP, public uploads, mutable audit and failed migrations are reported", () => {
  const result = statusOf({
    ...healthy,
    authSecret: "short",
    canEncryptSecrets: false,
    appUrl: "http://verein.example.org",
    uploadDir: "./public/uploads",
    auditTriggers: ["audit_log_no_update"],
    failedMigrations: 1,
  });
  assert.deepEqual(result, {
    authSecret: "fail",
    secretEncryption: "fail",
    appUrlHttps: "fail",
    uploadsNotPublic: "fail",
    auditAppendOnly: "fail",
    migrations: "fail",
    productionMode: "pass",
  });
});

test("development mode and a missing APP_URL are warnings, not failures", () => {
  const result = statusOf({ ...healthy, nodeEnv: "development", appUrl: undefined, authSecret: "y".repeat(20) });
  assert.equal(result.productionMode, "warn");
  assert.equal(result.appUrlHttps, "warn");
  assert.equal(result.authSecret, "warn");
});
