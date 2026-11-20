/**
 * RFC-002 / #419 — lisans: imza, alan adı + kurum bağlaması, süre ve ek süre, özellik kapısı.
 */
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test, { describe } from "node:test";

import { evaluateLicense, normalizeDomain, normalizeIdentity, parseLicense, signLicense, statusHasFeature, type LicensePayload } from "@/shared/licensing/license";
import { keyIdOf } from "@/shared/marketplace/package";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const issuers = [{ keyId: keyIdOf(publicPem), publicKey: publicPem }];
const payload: LicensePayload = {
  licenseId: "L-TEST0001",
  tier: "enterprise",
  organisation: { name: "Beispiel Kulturverein e.V.", registryId: "VR 12345" },
  domain: "erp.beispiel.de",
  features: ["help-center"],
  issuedAt: "2031-01-01T00:00:00.000Z",
  expiresAt: "2031-12-31T23:59:59.000Z",
};
const text = JSON.stringify(signLicense(payload, privateKey, publicPem));
const instance = { domain: "erp.beispiel.de", organisation: { name: "Beispiel Kulturverein e. V.", registryId: "vr12345" } };
const at = (iso: string) => ({ now: new Date(iso) });

describe("lisans", () => {
  test("geçerli: alan adı + kurum eşleşir, özellik açık", () => {
    const status = evaluateLicense(text, issuers, instance, at("2031-06-01T00:00:00Z"));
    assert.equal(status.state, "valid");
    assert.equal(statusHasFeature(status, "help-center"), true);
    assert.equal(statusHasFeature(status, "other"), false);
  });

  test("lisans yok / bozuk / yayıncı bilinmiyor / imza bozuk", () => {
    assert.equal(evaluateLicense(null, issuers, instance).state, "none");
    assert.deepEqual(evaluateLicense("{x", issuers, instance), { state: "invalid", reason: "format" });
    assert.deepEqual(evaluateLicense(text, [], instance), { state: "invalid", reason: "issuer" });
    const tampered = JSON.parse(text);
    tampered.payload.features = ["help-center", "everything"];
    assert.deepEqual(evaluateLicense(JSON.stringify(tampered), issuers, instance), { state: "invalid", reason: "signature" });
    const moved = JSON.parse(text);
    moved.payload.domain = "other.example.org";
    assert.equal(evaluateLicense(JSON.stringify(moved), issuers, instance).state, "invalid", "alan adını değiştirmek imzayı bozar");
  });

  test("bağlama: alan adı VE kurum zorunlu", () => {
    const wrongDomain = evaluateLicense(text, issuers, { ...instance, domain: "erp.baska.de" }, at("2031-06-01T00:00:00Z"));
    assert.equal(wrongDomain.state, "mismatch");
    assert.equal(wrongDomain.state === "mismatch" && wrongDomain.reason, "domain");
    assert.equal(evaluateLicense(text, issuers, { ...instance, domain: null }).state, "mismatch");
    const wrongOrg = evaluateLicense(text, issuers, { ...instance, organisation: { name: "Anderer Verein e.V.", registryId: "VR 12345" } }, at("2031-06-01T00:00:00Z"));
    assert.equal(wrongOrg.state === "mismatch" && wrongOrg.reason, "organisation");
    const wrongRegistry = evaluateLicense(text, issuers, { ...instance, organisation: { name: instance.organisation.name, registryId: "VR 99999" } }, at("2031-06-01T00:00:00Z"));
    assert.equal(wrongRegistry.state === "mismatch" && wrongRegistry.reason, "organisation");
    assert.equal(statusHasFeature(wrongOrg, "help-center"), false);
  });

  test("süre: 14 gün ek süre, sonra kapalı", () => {
    const grace = evaluateLicense(text, issuers, instance, at("2032-01-10T00:00:00Z"));
    assert.equal(grace.state, "grace");
    assert.equal(statusHasFeature(grace, "help-center"), true);
    const expired = evaluateLicense(text, issuers, instance, at("2032-01-15T00:00:01Z"));
    assert.equal(expired.state, "expired");
    assert.equal(statusHasFeature(expired, "help-center"), false);
    assert.equal(evaluateLicense(text, issuers, instance, { now: new Date("2032-01-10T00:00:00Z"), graceDays: 0 }).state, "expired");
  });

  test("normalleştirme ve biçim sınırları", () => {
    assert.equal(normalizeIdentity("Beispiel Kulturverein e. V."), normalizeIdentity("beispiel kulturverein e.V."));
    assert.equal(normalizeDomain("https://ERP.Beispiel.de:443/pfad"), "erp.beispiel.de");
    assert.equal(parseLicense("x".repeat(20_000)), null);
    const bad = JSON.parse(text);
    bad.payload.features = ["Bad Feature"];
    assert.equal(parseLicense(JSON.stringify(bad)), null);
  });
});
