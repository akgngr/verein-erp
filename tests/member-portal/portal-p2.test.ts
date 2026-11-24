import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { signReceiptRef, verifyReceiptRef } from "../../src/modules/member-portal/services/receipt-ref";

describe("Member Portal P2 — Corrections Queue, Consents & Receipts (ADR 0010)", () => {
  it("signed receipt refs are opaque, subject-bound (IDOR-safe), and short-lived", () => {
    const now = 1_760_000_000_000;
    const ref = signReceiptRef({
      kind: "dues",
      id: "pay_12345",
      subjectRef: "member:mem_alice",
      ttlSeconds: 300,
      nowMs: now,
    });

    assert.ok(!ref.includes("pay_12345"), "raw database id must not appear in opaque ref");
    assert.deepEqual(verifyReceiptRef(ref, "member:mem_alice", now + 60_000), {
      kind: "dues",
      id: "pay_12345",
    });

    // Foreign subject refused (IDOR)
    assert.equal(verifyReceiptRef(ref, "member:mem_bob", now + 60_000), null);

    // Expired ref refused
    assert.equal(verifyReceiptRef(ref, "member:mem_alice", now + 301_000), null);

    // Guessed / tampered ref refused
    assert.equal(verifyReceiptRef("pay_12345", "member:mem_alice", now + 60_000), null);
    assert.equal(verifyReceiptRef(`${ref}tamper`, "member:mem_alice", now + 60_000), null);
  });

  it("correction proposals never write directly to Member and board approval is audited", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/modules/members/services/portal-self-service.tsx"),
      "utf8",
    );
    const proposeIdx = src.indexOf("export async function proposeMemberCorrectionForPortal");
    const reviewIdx = src.indexOf("export async function reviewMemberCorrectionProposalAction");
    assert.ok(proposeIdx !== -1 && reviewIdx !== -1);

    const proposeBody = src.slice(proposeIdx, reviewIdx);
    assert.ok(!proposeBody.includes("db.member.update"), "propose must never write Member directly");
    assert.ok(proposeBody.includes("PORTAL_CORRECTION_PROPOSED"), "propose must be audited");

    const reviewBody = src.slice(reviewIdx, src.indexOf("export async function getMemberConsentsForPortal"));
    assert.ok(reviewBody.includes("PORTAL_CORRECTION_APPROVED"), "approval must be audited");
    assert.ok(reviewBody.includes("MEMBER_UPDATED"), "applying correction must be audited");
  });

  it("receipt download route enforces step-up and signed ref verification", () => {
    const routeSrc = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/api/receipts/[ref]/route.ts"),
      "utf8",
    );
    assert.ok(routeSrc.includes("isPortalStepUpActive(session)"));
    assert.ok(routeSrc.includes("stepUpRequired"));
    assert.ok(routeSrc.includes("verifyReceiptRef(ctx.ref, session.subjectRef)"));
    assert.ok(routeSrc.includes("Cache-Control\": \"private, no-store\""));
  });

  it("consents revoke immediately and opt-in requires double opt-in challenge", () => {
    const serviceSrc = readFileSync(
      path.join(process.cwd(), "src/modules/member-portal/services/self-service.ts"),
      "utf8",
    );
    assert.ok(serviceSrc.includes("revokeMemberConsentForPortal"));
    assert.ok(serviceSrc.includes("portalConsentChallenge.create"));
    assert.ok(serviceSrc.includes("/api/member-portal/consents/confirm"));
    assert.ok(serviceSrc.includes("grantMemberConsentForPortal"));
  });
});
