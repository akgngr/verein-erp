import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { getLoginFailureState, LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from "@/shared/security/login-lockout";
import { getDb } from "@/shared/db";
import { writeAudit } from "@/shared/audit/write-audit";

describe("Rate Limiting Koruması", () => {
  test("ardışık beş başarısız girişten sonra hesap 15 dakika kilitlenir", () => {
    const now = new Date("2026-11-05T12:00:00.000Z");
    let state = { failedLoginCount: 0, lockedUntil: null as Date | null, shouldLock: false };

    for (let attempt = 1; attempt <= MAX_FAILED_ATTEMPTS; attempt += 1) {
      state = getLoginFailureState(state.failedLoginCount, state.lockedUntil, now);
      if (attempt < MAX_FAILED_ATTEMPTS) {
        assert.equal(state.shouldLock, false);
        assert.equal(state.failedLoginCount, attempt);
      }
    }

    assert.equal(state.shouldLock, true);
    assert.equal(state.failedLoginCount, 0);
    assert.equal(state.lockedUntil?.getTime(), now.getTime() + LOCK_MINUTES * 60_000);
  });

  test("süresi dolan kilit yeni başarısız giriş sayacını sıfırdan başlatır", () => {
    const now = new Date("2026-11-05T12:00:00.000Z");
    const expiredLock = new Date(now.getTime() - 1);
    const state = getLoginFailureState(4, expiredLock, now);

    assert.equal(state.shouldLock, false);
    assert.equal(state.failedLoginCount, 1);
    assert.equal(state.lockedUntil, null);
  });

  test("denetim kaydı hassas parola alanlarını saklamaz", async () => {
    const db = getDb();
    const entityId = randomUUID();

    await writeAudit({
      action: "SECURITY_TEST_AUDIT",
      entity: "Auth",
      entityId,
      after: {
        email: "security-test@example.com",
        password: "must-not-be-stored",
        passwordHash: "must-not-be-stored",
      },
      ip: "127.0.0.1",
    });

    const audit = await db.auditLog.findFirst({ where: { entityId, action: "SECURITY_TEST_AUDIT" } });
    assert.ok(audit);
    assert.deepEqual(audit.changes, {
      before: null,
      after: { email: "security-test@example.com" },
    });
  });
});
