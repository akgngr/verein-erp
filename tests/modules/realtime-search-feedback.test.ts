import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://unused/never-connected";
process.env.AUTH_SECRET ??= "test-realtime-search-feedback-secret-0123456789";

describe("Issue #633 — Realtime SSE bus, Feedback module context & reply alert, Global Quick Search", () => {
  test("stream-bus encodes/decodes instanceId:userId without PII and delivers in-process updates", async () => {
    const {
      decodeNotificationPayload,
      emitNotificationUpdate,
      encodeNotificationPayload,
      subscribeNotificationUpdates,
    } = await import("@/modules/notifications/services/stream-bus");

    const payload = encodeNotificationPayload("inst123", "user-42");
    assert.equal(payload, "inst123:user-42");
    assert.deepEqual(decodeNotificationPayload(payload), {
      instanceId: "inst123",
      userId: "user-42",
    });
    assert.equal(decodeNotificationPayload("invalid"), null);

    let hits = 0;
    const unsub = subscribeNotificationUpdates("user-42", () => {
      hits += 1;
    });
    emitNotificationUpdate("user-42");
    emitNotificationUpdate("user-other");
    assert.equal(hits, 1);

    unsub();
    emitNotificationUpdate("user-42");
    assert.equal(hits, 1);
  });

  test("feedback module-context resolves active module key and version from pageUrl", async () => {
    const { resolveFeedbackAppVersion, resolveModuleContextFromUrl } = await import(
      "@/modules/feedback/services/module-context"
    );

    const acc = resolveModuleContextFromUrl("https://verein.example/muhasebe/fisler");
    assert.ok(acc);
    assert.equal(acc.key, "accounting");
    assert.match(acc.version, /^\d+\.\d+\.\d+$/);

    const localized = resolveModuleContextFromUrl("/de/toplantilar/m-1?sekme=genel");
    assert.ok(localized);
    assert.equal(localized.key, "meetings");

    const formatted = resolveFeedbackAppVersion("/uyeler/u-1", "0.41.0");
    assert.match(formatted ?? "", /^0\.41\.0 \(members@\d+\.\d+\.\d+\)$/);

    assert.equal(resolveFeedbackAppVersion("/bilinmeyen-yol", "0.41.0"), "0.41.0");
  });

  test("feedback.replied notification, /api/search, and QuickSearchPalette are wired", async () => {
    const { notifications } = await import("@/modules/feedback/notifications");
    assert.equal(notifications.module, "feedback");
    assert.ok(notifications.types.some((t) => t.key === "replied"));

    const root = process.cwd();
    assert.ok(fs.existsSync(path.join(root, "src/app/api/search/route.ts")));
    assert.ok(
      fs.existsSync(path.join(root, "src/shared/components/search/quick-search-palette.tsx")),
    );
  });
});
