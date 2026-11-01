import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";

import { buildPackage, isSafePackagePath, keyIdOf, readPackage, verifyPackage, type TrustedPublisher } from "../src/shared/marketplace/package";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const trusted: TrustedPublisher[] = [{ publisher: "acme", keyId: keyIdOf(publicKeyPem), publicKey: publicKeyPem }];
const files = { "module.config.ts": Buffer.from("export const moduleConfig = {};"), "messages/tr.json": Buffer.from("{}") };
const manifest = { key: "acme-tools", version: "1.0.0", name: "Acme", description: "x", publisher: "acme", category: "EXTENSION" as const };

test("imzalı paket doğrulanır", () => {
  const pkg = readPackage(buildPackage({ manifest, files, privateKey, publicKeyPem }));
  const result = verifyPackage(pkg, trusted, { appVersion: "0.33.0" });
  assert.deepEqual(result.errors, []);
  assert.ok(result.ok);
});

test("değiştirilmiş dosya, güvenilmeyen yayıncı ve yetkisiz kategori reddedilir", () => {
  const pkg = readPackage(buildPackage({ manifest, files, privateKey, publicKeyPem }));
  pkg.files["module.config.ts"] = Buffer.from("evil()").toString("base64");
  assert.ok(verifyPackage(pkg, trusted).errors.includes("hash:module.config.ts"));
  const untrusted = readPackage(buildPackage({ manifest, files, privateKey, publicKeyPem }));
  assert.ok(verifyPackage(untrusted, []).errors.includes("untrusted"));
  const core = readPackage(buildPackage({ manifest: { ...manifest, category: "CORE" }, files, privateKey, publicKeyPem }));
  assert.ok(verifyPackage(core, trusted).errors.includes("categoryNotAllowed"));
});

test("manifest değişirse imza tutmaz; eklenen dosya yakalanır", () => {
  const pkg = readPackage(buildPackage({ manifest, files, privateKey, publicKeyPem }));
  pkg.manifest.version = "9.9.9";
  assert.ok(verifyPackage(pkg, trusted).errors.includes("signature"));
  const extra = readPackage(buildPackage({ manifest, files, privateKey, publicKeyPem }));
  extra.files["server.ts"] = Buffer.from("x").toString("base64");
  assert.ok(verifyPackage(extra, trusted).errors.includes("mismatch:server.ts"));
});

test("güvensiz yollar reddedilir", () => {
  for (const bad of ["../x.ts", "/etc/passwd.txt", "a/../../b.ts", ".env.json", "node_modules/x/index.ts", "run.sh", "a\\b.ts"]) assert.equal(isSafePackagePath(bad), false, bad);
  assert.ok(isSafePackagePath("views/list-view.tsx"));
  assert.ok(isSafePackagePath("migrations/20270101000000_x/migration.sql"));
});
