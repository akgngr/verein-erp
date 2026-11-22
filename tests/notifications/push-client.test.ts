/**
 * N3b (#360) — Web Push client, service worker, manifest ve tarayıcı uyumluluğu sözleşme testleri.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  toCleanSubscriptionPayload,
  urlBase64ToUint8Array,
} from "@/modules/notifications/components/push-utils";
import { subscriptionSchema } from "@/modules/notifications/services/web-push";

const ROOT = process.cwd();

test("push-utils: urlBase64ToUint8Array base64 ve base64url dizgelerini doğru ayrıştırır", () => {
  const raw = "VereinERP-WebPush-Key-Test-1234567890";
  const b64 = Buffer.from(raw).toString("base64");
  const b64Url = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res1 = urlBase64ToUint8Array(b64);
  const res2 = urlBase64ToUint8Array(b64Url);

  assert.equal(Buffer.from(res1).toString("utf8"), raw);
  assert.equal(Buffer.from(res2).toString("utf8"), raw);
  assert.deepEqual(res1, res2);
});

test("push-utils: toCleanSubscriptionPayload backend subscriptionSchema ile tam uyumlu", () => {
  const fakeSub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc-endpoint-token",
    expirationTime: 1732176000000, // Browser-injected field that would break strict schema
    toJSON: () => ({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc-endpoint-token",
      expirationTime: 1732176000000,
      keys: {
        p256dh: "B".repeat(87),
        auth: "a".repeat(22),
      },
    }),
  } as unknown as PushSubscription;

  const payload = toCleanSubscriptionPayload(fakeSub);
  assert.ok(payload);
  assert.equal(payload.endpoint, "https://fcm.googleapis.com/fcm/send/abc-endpoint-token");
  assert.equal((payload as unknown as { expirationTime?: unknown }).expirationTime, undefined, "expirationTime elenmelidir");
  assert.equal(payload.keys.p256dh, "B".repeat(87));
  assert.equal(payload.keys.auth, "a".repeat(22));

  // Verify that it passes backend strict subscriptionSchema
  const parseResult = subscriptionSchema.safeParse(payload);
  assert.equal(parseResult.success, true);
});

test("push-utils: eksik alanlı veya bozuk aboneliklerde toCleanSubscriptionPayload null döner", () => {
  const badSub1 = {
    toJSON: () => ({ endpoint: "" }),
  } as unknown as PushSubscription;
  assert.equal(toCleanSubscriptionPayload(badSub1), null);

  const badSub2 = {
    toJSON: () => ({
      endpoint: "https://fcm.googleapis.com/x",
      keys: {},
    }),
  } as unknown as PushSubscription;
  assert.equal(toCleanSubscriptionPayload(badSub2), null);
});

test("service-worker: public/sw.js gerekli olay dinleyicilerini ve güvenlik kurallarını içerir", () => {
  const swPath = path.join(ROOT, "public/sw.js");
  assert.ok(fs.existsSync(swPath), "public/sw.js dosyası mevcut olmalıdır");

  const swContent = fs.readFileSync(swPath, "utf8");

  // Essential SW lifecycle & push events
  assert.ok(swContent.includes('addEventListener("install"'), "install dinleyicisi olmalı");
  assert.ok(swContent.includes('addEventListener("activate"'), "activate dinleyicisi olmalı");
  assert.ok(swContent.includes('addEventListener("push"'), "push dinleyicisi olmalı");
  assert.ok(swContent.includes('addEventListener("notificationclick"'), "notificationclick dinleyicisi olmalı");
  assert.ok(swContent.includes('addEventListener("pushsubscriptionchange"'), "pushsubscriptionchange dinleyicisi olmalı");

  // Same-origin navigation safety: prevents open redirect / SSRF
  assert.ok(swContent.includes("self.location.origin"), "hedef URL origin kontrolü yapılmalıdır");
  assert.ok(swContent.includes("notification.close()"), "tıklamada bildirim kapatılmalıdır");

  // Personal data leakage check: no console.log dumping payload/token
  assert.ok(!swContent.includes("console.log("), "SW içinde veri sızdıran console.log bulunmamalıdır");
});

test("manifest: src/app/manifest.ts geçerli PWA standartlarındadır ve statik json ile çakışmaz", async () => {
  const jsonPath = path.join(ROOT, "public/manifest.json");
  assert.ok(!fs.existsSync(jsonPath), "public/manifest.json drifting önlemek için kaldırılmış olmalı");

  const manifestTs = await import("@/app/manifest");
  const generated = manifestTs.default();
  assert.equal(generated.name, "Verein ERP");
  assert.equal(generated.short_name, "Verein ERP");
  assert.equal(generated.display, "standalone");
  assert.ok(Array.isArray(generated.icons) && generated.icons.length > 0);
});

test("i18n: Web Push bildirimleri TR ve DE çeviri anahtarları tam pariteye sahiptir", () => {
  const tr = JSON.parse(fs.readFileSync(path.join(ROOT, "src/modules/notifications/messages/tr.json"), "utf8"));
  const de = JSON.parse(fs.readFileSync(path.join(ROOT, "src/modules/notifications/messages/de.json"), "utf8"));

  assert.ok(tr.ui?.push, "tr.json ui.push nesnesi içermeli");
  assert.ok(de.ui?.push, "de.json ui.push nesnesi içermeli");

  const trKeys = Object.keys(tr.ui.push).sort();
  const deKeys = Object.keys(de.ui.push).sort();

  assert.deepEqual(trKeys, deKeys, "TR ve DE push çeviri anahtarları birebir eşleşmelidir");
  for (const k of trKeys) {
    assert.ok(typeof tr.ui.push[k] === "string" && tr.ui.push[k].length > 0, `TR anahtarı boş olamaz: ${k}`);
    assert.ok(typeof de.ui.push[k] === "string" && de.ui.push[k].length > 0, `DE anahtarı boş olamaz: ${k}`);
  }
});
