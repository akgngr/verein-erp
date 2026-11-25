import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import {
  clearGoCardlessTokenCache,
  GoCardlessProvider,
  goCardlessCacheKey,
} from "@/modules/banking/services/providers/gocardless";
import { BankProviderError } from "@/modules/banking/services/providers/types";
import { resolvePublicOrigin } from "@/shared/security/public-origin";

test("S3-1: resolvePublicOrigin ignores spoofed Host/X-Forwarded-Host headers and fails closed in production", () => {
  const spoofed = new Headers({
    host: "evil.attacker.com",
    "x-forwarded-host": "evil.attacker.com",
    "x-forwarded-proto": "https",
  });

  // Always prefers configured APP_URL even with spoofed headers
  assert.equal(
    resolvePublicOrigin(spoofed, { env: { APP_URL: "https://erp.verein.de/path", NODE_ENV: "production" } }),
    "https://erp.verein.de",
  );

  // Fails closed in production when APP_URL is unset
  assert.equal(resolvePublicOrigin(spoofed, { env: { APP_URL: "", NODE_ENV: "production" } }), null);

  // Rejects spoofed non-loopback hosts even in development when APP_URL is unset
  assert.equal(resolvePublicOrigin(spoofed, { env: { APP_URL: "", NODE_ENV: "development" } }), null);

  // Allows loopback hosts in development when APP_URL is unset
  const localHeaders = new Headers({ host: "localhost:3000", "x-forwarded-host": "evil.attacker.com" });
  assert.equal(
    resolvePublicOrigin(localHeaders, { env: { APP_URL: "", NODE_ENV: "development" } }),
    "http://localhost:3000",
  );
  assert.equal(
    resolvePublicOrigin(new Headers({ host: "127.0.0.1:4000" }), { env: { APP_URL: "", NODE_ENV: "test" } }),
    "http://127.0.0.1:4000",
  );
});

test("S3-2: zero raw x-forwarded-host URL builders remain across src/modules", async () => {
  for (const rel of [
    "src/modules/banking/actions/banking-actions.ts",
    "src/modules/banking/services/callback.ts",
    "src/modules/sepa/actions/sepa-actions.ts",
    "src/modules/online-forms/actions/online-form-actions.ts",
    "src/modules/mailings/actions/mailing-actions.ts",
    "src/modules/mailings/views/mailings-settings-view.tsx",
    "src/modules/calendar/services/origin.ts",
    "src/modules/courses/actions/teacher-actions.ts",
    "src/modules/campaign-sms/api/webhook/twilio/route.ts",
  ]) {
    const src = await readFile(path.resolve(process.cwd(), rel), "utf8");
    assert.equal(src.includes("x-forwarded-host"), false, `${rel} must not read x-forwarded-host`);
    assert.equal(src.includes("resolvePublicOrigin"), true, `${rel} must use resolvePublicOrigin`);
  }
});

test("S3-3: users ADMIN-target guards and role-action ADMIN lock exist across actions", async () => {
  for (const rel of [
    "src/modules/users/actions/reset-password.ts",
    "src/modules/users/actions/set-active.ts",
    "src/modules/users/actions/delete-user.ts",
  ]) {
    const src = await readFile(path.resolve(process.cwd(), rel), "utf8");
    assert.match(src, /user\.role !== "ADMIN" && target\.role === "ADMIN"/, `${rel} must guard ADMIN targets`);
  }

  const rolesSrc = await readFile(path.resolve(process.cwd(), "src/modules/users/actions/roles.ts"), "utf8");
  const adminChecks = rolesSrc.match(/user\.role !== "ADMIN"/g) ?? [];
  assert.equal(adminChecks.length >= 5, true, "all 5 role actions must require ADMIN role");
});

test("S3-4: GoCardless token cache separates rotated secretKey, evicts/retries on 401, and distinguishes 429", async () => {
  assert.notEqual(
    goCardlessCacheKey("same-id", "old-secret"),
    goCardlessCacheKey("same-id", "rotated-secret"),
    "token cache key must change when secretKey rotates",
  );

  clearGoCardlessTokenCache();
  const originalFetch = globalThis.fetch;
  let tokenCalls = 0;
  let apiCalls = 0;
  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/token/new/")) {
        tokenCalls += 1;
        return new Response(JSON.stringify({ access: `tok-${tokenCalls}`, access_expires: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      apiCalls += 1;
      if (apiCalls === 1) {
        return new Response("expired", { status: 401 });
      }
      if (apiCalls === 2) {
        return new Response(JSON.stringify([{ id: "DE_BANK", name: "Test Bank" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("too many", { status: 429 });
    }) as typeof fetch;

    const provider = new GoCardlessProvider("sec-1", "key-1");
    const institutions = await provider.listInstitutions("DE");
    assert.equal(institutions.length, 1);
    assert.equal(tokenCalls, 2, "401 must evict token cache and fetch fresh token once");
    assert.equal(apiCalls, 2);

    await assert.rejects(
      () => provider.listInstitutions("DE"),
      (err: unknown) => err instanceof BankProviderError && err.code === "rateLimit",
      "HTTP 429 must map to BankProviderError(rateLimit)",
    );
  } finally {
    globalThis.fetch = originalFetch;
    clearGoCardlessTokenCache();
  }
});
