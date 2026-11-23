import test from "node:test";
import assert from "node:assert/strict";

import {
  computeModuleReadiness,
  redactErrorCategory,
} from "../../src/modules/system/services/readiness-core";

test("redactErrorCategory: harici ve hassas hata detaylarını güvenli kategorilere indirger", () => {
  // Timeout
  assert.equal(redactErrorCategory("ETIMEDOUT", "Connect timed out after 5000ms"), "TIMEOUT");
  assert.equal(redactErrorCategory(null, "Request timedout while waiting for response"), "TIMEOUT");

  // Network
  assert.equal(redactErrorCategory("ECONNREFUSED", "fetch failed: 127.0.0.1:5432"), "NETWORK_ERROR");
  assert.equal(redactErrorCategory(null, "socket hang up on mail.example.com"), "NETWORK_ERROR");

  // Auth / Permissions
  assert.equal(redactErrorCategory("FORBIDDEN", "User user_123 is not authorized to export"), "AUTH_OR_PERMISSION_ERROR");
  assert.equal(redactErrorCategory(null, "permission_denied: table members"), "AUTH_OR_PERMISSION_ERROR");

  // Validation
  assert.equal(redactErrorCategory("ZOD_ERROR", "invalid email address given: user@domain.com"), "VALIDATION_ERROR");

  // Database
  assert.equal(redactErrorCategory("P2002", "Unique constraint failed on the constraint: email_1"), "DATABASE_ERROR");

  // Rate limit
  assert.equal(redactErrorCategory("429", "Too Many Requests to provider"), "RATE_LIMIT");

  // Fallback
  assert.equal(redactErrorCategory("CUSTOM_CODE", "Something odd happened"), "UNKNOWN_ERROR");
});

test("computeModuleReadiness: etkin ve pasif modülleri doğru özetler", () => {
  const report = computeModuleReadiness({
    modules: [
      { key: "system", label: "System", category: "CORE", isProtected: true },
      { key: "accounting", label: "Muhasebe", category: "CORE", isProtected: true },
      { key: "weather", label: "Hava Durumu", category: "OFFICIAL" },
      { key: "donations", label: "Bağışlar", category: "OFFICIAL", access: [{ module: "accounting", operations: ["read"] }] },
    ],
    states: {
      system: true,
      accounting: true,
      weather: false, // Pasif modül
      donations: true,
    },
    accessApprovedMap: {
      system: true,
      accounting: true,
      weather: true,
      donations: false, // İzin onayı bekliyor
    },
    configurationMap: {
      system: { status: "COMPLETE", missingKeys: [] },
      accounting: {
        status: "INCOMPLETE",
        missingKeys: ["accountingAccount"],
        guidanceKey: "accountingMissingAccount",
        fixHref: "/muhasebe/ayarlar",
      },
      weather: { status: "COMPLETE", missingKeys: [] },
      donations: { status: "COMPLETE", missingKeys: [] },
    },
    failedJobsMap: {
      system: [],
      accounting: [
        { code: "ETIMEDOUT", message: "Timeout contacting payment gateway" },
        { code: "ETIMEDOUT", message: "Timeout contacting payment gateway" },
      ],
      weather: [],
      donations: [],
    },
    heartbeatMap: {
      system: { lastHeartbeatAt: new Date().toISOString(), activeCount: 1, isStale: false },
      accounting: { lastHeartbeatAt: null, activeCount: 0, isStale: false },
      weather: { lastHeartbeatAt: null, activeCount: 0, isStale: false },
      donations: { lastHeartbeatAt: null, activeCount: 0, isStale: false },
    },
  });

  // Toplam 4 modül, 3 aktif
  assert.equal(report.summary.totalModules, 4);
  assert.equal(report.summary.activeModules, 3);

  // Accounting modülü: INCOMPLETE + 2x TIMEOUT = WARNING
  const accounting = report.modules.find((m) => m.moduleKey === "accounting");
  assert.ok(accounting);
  assert.equal(accounting.overallStatus, "WARNING");
  assert.equal(accounting.configuration.status, "INCOMPLETE");
  assert.equal(accounting.failedJobs.totalFailed, 2);
  assert.equal(accounting.failedJobs.categories["TIMEOUT"], 2);

  // Donations modülü: access onayı bekliyor = WARNING
  const donations = report.modules.find((m) => m.moduleKey === "donations");
  assert.ok(donations);
  assert.equal(donations.overallStatus, "WARNING");
  assert.equal(donations.accessGrants.status, "PENDING");
  assert.equal(donations.accessGrants.pendingCount, 1);

  // Weather modülü: pasif modül = HEALTHY (işletim uyarısı yok)
  const weather = report.modules.find((m) => m.moduleKey === "weather");
  assert.ok(weather);
  assert.equal(weather.isActive, false);
  assert.equal(weather.overallStatus, "HEALTHY");

  // System modülü: aktif, complete, sağlıklı worker = HEALTHY
  const system = report.modules.find((m) => m.moduleKey === "system");
  assert.ok(system);
  assert.equal(system.overallStatus, "HEALTHY");
  assert.equal(system.workerHeartbeat.status, "HEALTHY");
});

test("computeModuleReadiness: KESİN GİZLİLİK DOĞRULAMASI (Çıktıda hiçbir kişisel veya ham hata verisi bulunmaz)", () => {
  // Hassas kullanıcı ve hata verileri içeren simülasyon girdisi
  const report = computeModuleReadiness({
    modules: [
      { key: "members", label: "Üyeler", category: "CORE", isProtected: true },
    ],
    states: { members: true },
    accessApprovedMap: { members: true },
    configurationMap: {
      members: { status: "COMPLETE", missingKeys: [] },
    },
    failedJobsMap: {
      members: [
        {
          code: "P2002",
          message: "Unique constraint failed for user Max Mustermann with email max.mustermann@example.com and IBAN DE12345678901234567890 at /app/server.ts:120:5",
        },
        {
          code: "TIMEOUT",
          message: "Recipient user_cuid_987654321 failed to receive push payload: { token: 'secret-token-xyz' }",
        },
      ],
    },
    heartbeatMap: {
      members: { lastHeartbeatAt: new Date().toISOString(), activeCount: 0, isStale: false },
    },
  });

  const serialized = JSON.stringify(report);

  // 1. E-posta adresi bulunmamalıdır
  assert.doesNotMatch(serialized, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

  // 2. IBAN bulunmamalıdır
  assert.doesNotMatch(serialized, /DE\d{20}/);

  // 3. Kişi adı veya soyadı bulunmamalıdır
  assert.doesNotMatch(serialized, /Max|Mustermann/i);

  // 4. Token veya payload içeriği bulunmamalıdır
  assert.doesNotMatch(serialized, /secret-token|user_cuid/i);

  // 5. Stack trace veya dosya yolu bulunmamalıdır
  assert.doesNotMatch(serialized, /\/app\/server\.ts/i);

  // 6. Yalnızca kategorize edilmiş sayaçlar yer almalıdır
  const members = report.modules.find((m) => m.moduleKey === "members");
  assert.ok(members);
  assert.equal(members.failedJobs.totalFailed, 2);
  assert.deepEqual(members.failedJobs.categories, {
    DATABASE_ERROR: 1,
    TIMEOUT: 1,
  });
});
