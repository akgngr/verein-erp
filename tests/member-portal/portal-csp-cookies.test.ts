import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildPortalCsp,
  generatePortalNonce,
} from "../../src/modules/member-portal/services/portal-csp";

describe("Member Portal — CSP Nonce, SameSite=Strict & Secure __Host- Cookies (#551)", () => {
  it("buildPortalCsp includes required directives and nonce", () => {
    const csp = buildPortalCsp("abc123");
    assert.ok(csp.includes("script-src 'self' 'nonce-abc123' 'strict-dynamic'"));
    assert.ok(csp.includes("style-src 'self' 'unsafe-inline'"));
    assert.ok(csp.includes("img-src 'self' data:"));
    assert.ok(csp.includes("connect-src 'self'"));
    assert.ok(csp.includes("base-uri 'none'"));
    assert.ok(csp.includes("form-action 'self'"));
    assert.ok(csp.includes("frame-ancestors 'none'"));
  });

  it("generatePortalNonce produces unique nonces per request and proxy forwards x-nonce", () => {
    const n1 = generatePortalNonce();
    const n2 = generatePortalNonce();
    assert.ok(n1.length >= 16);
    assert.notEqual(n1, n2, "nonce must differ per request");

    const csp1 = buildPortalCsp(n1);
    const csp2 = buildPortalCsp(n2);
    assert.ok(csp1.includes(`'nonce-${n1}'`));
    assert.ok(csp2.includes(`'nonce-${n2}'`));
    assert.notEqual(csp1, csp2);

    const proxySrc = readFileSync(path.join(process.cwd(), "src/proxy.ts"), "utf8");
    assert.ok(proxySrc.includes('requestHeaders.set("x-nonce", nonce)'));
    assert.ok(proxySrc.includes("NextResponse.next({ request: { headers: requestHeaders } })"));
  });

  it("session cookie uses SameSite=Strict and both __Host- cookies always use Secure=true", () => {
    const confirmSrc = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/api/confirm/route.ts"),
      "utf8",
    );
    const magicSrc = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/api/magic-link/route.ts"),
      "utf8",
    );

    assert.ok(confirmSrc.includes('sameSite: "strict"'));
    assert.ok(confirmSrc.includes("secure: true"));
    assert.ok(!confirmSrc.includes('process.env.NODE_ENV === "production"'));

    assert.ok(magicSrc.includes("secure: true"));
    assert.ok(!magicSrc.includes('process.env.NODE_ENV === "production"'));
  });
});
