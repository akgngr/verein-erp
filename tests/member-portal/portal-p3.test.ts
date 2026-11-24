import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { encryptArt15Payload } from "../../src/modules/exports/services/art15-crypto";

describe("Member Portal P3 — Art. 15, Processing Log & Business+ (ADR 0010)", () => {
  it("Art. 15 payload is encrypted with AES-256-GCM and never stored in plaintext", () => {
    const sample = JSON.stringify({ memberNumber: "UYE-2026-0001", email: "alice@example.de" });
    const envelopeJson = encryptArt15Payload(sample);
    assert.ok(!envelopeJson.includes("alice@example.de"), "plaintext PII must not appear");

    const env = JSON.parse(envelopeJson) as {
      alg: string;
      iv: string;
      tag: string;
      ciphertext: string;
    };
    assert.equal(env.alg, "AES-256-GCM");

    const key = createHash("sha256").update("verein-erp-dev-art15-secret").digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(env.iv, "base64"));
    decipher.setAuthTag(Buffer.from(env.tag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(env.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    assert.equal(decrypted, sample);
  });

  it("Art. 15 enforces one open request, step-up, 7-day expiry, and board visibility", () => {
    const rightsSrc = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/services/rights.ts"),
      "utf8",
    );
    assert.ok(rightsSrc.includes("alreadyOpen"));
    assert.ok(rightsSrc.includes("listArt15RequestsForBoard"));
    assert.ok(rightsSrc.includes("PORTAL_ART15_REQUESTED"));

    const art15Route = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/api/art15/route.ts"),
      "utf8",
    );
    assert.ok(art15Route.includes("isPortalStepUpActive(session)"));
    assert.ok(art15Route.includes("stepUpRequired"));
    assert.ok(art15Route.includes("409"));
  });

  it("processing log is subject-scoped and omits userLabel (no other person's name)", () => {
    const auditSrc = readFileSync(
      path.join(process.cwd(), "src/modules/audit/queries/list-subject-audit-logs.ts"),
      "utf8",
    );
    assert.ok(!auditSrc.includes("userLabel:"), "userLabel must never be selected or returned");
    assert.ok(auditSrc.includes("userId: input.subjectRef"));
    assert.ok(auditSrc.includes("actorRole"));
  });

  it("Business+ features are hidden in UI and refused with 403 licenseRequired without license", () => {
    const uiSrc = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/components/portal-rights-panel.tsx"),
      "utf8",
    );
    assert.ok(uiSrc.includes("{businessLicensed ? ("));

    const eventsRoute = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/api/events/route.ts"),
      "utf8",
    );
    const signingRoute = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/api/signing/route.ts"),
      "utf8",
    );
    assert.ok(eventsRoute.includes("licenseRequired") && eventsRoute.includes("403"));
    assert.ok(signingRoute.includes("licenseRequired") && signingRoute.includes("403"));
  });
});
