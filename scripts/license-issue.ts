/**
 * pnpm license:issue --key <gizli.pem> --org "<kurum adı>" [--registry "VR 12345"] --domain <alan.adi>
 *                     --features help-center[,diğer] --until 2027-12-31 [--tier enterprise] [--id <lisans-no>]
 * İmzalı lisans (vlic-1) JSON'unu stdout'a yazar; müşteri Ayarlar → Lisans'a yapıştırır. (RFC-002)
 */
import { createPrivateKey, createPublicKey, randomUUID } from "node:crypto";
import fs from "node:fs";

import { normalizeDomain, parseLicense, signLicense, type LicensePayload } from "../src/shared/licensing/license";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const keyPath = arg("key") ?? fail("--key <gizli.pem> gerekli");
const org = arg("org") ?? fail('--org "<kurum adı>" gerekli');
const domain = normalizeDomain(arg("domain") ?? fail("--domain gerekli"));
const until = arg("until") ?? fail("--until YYYY-MM-DD gerekli");
const features = (arg("features") ?? fail("--features gerekli")).split(",").map((f) => f.trim()).filter(Boolean);
const tier = (arg("tier") ?? "enterprise") as LicensePayload["tier"];
const expires = new Date(`${until}T23:59:59Z`);
if (Number.isNaN(expires.getTime())) fail("--until geçersiz tarih");

const privateKey = createPrivateKey(fs.readFileSync(keyPath, "utf8"));
const publicPem = createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
const registry = arg("registry");
const payload: LicensePayload = {
  licenseId: arg("id") ?? `L-${randomUUID().slice(0, 8).toUpperCase()}`,
  tier,
  organisation: registry ? { name: org, registryId: registry } : { name: org },
  domain,
  features,
  issuedAt: new Date().toISOString(),
  expiresAt: expires.toISOString(),
};
const text = JSON.stringify(signLicense(payload, privateKey, publicPem));
if (!parseLicense(text)) fail("Üretilen lisans biçim denetiminden geçmedi (özellik adları: a-z0-9-).");
console.log(text);
