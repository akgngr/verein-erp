/**
 * pnpm license:keygen <etiket> — lisans yayıncısı için Ed25519 anahtar çifti (RFC-002).
 *   license-<etiket>.private.pem → GİZLİ: yalnız ürün sahibinde kalır, depoya ASLA girmez (.gitignore).
 *   Çıktıdaki JSON'u src/config/license-issuers.json → issuers'a ekleyin (kod incelemesiyle).
 */
import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";

import { keyIdOf } from "../src/shared/marketplace/package";

const label = process.argv[2];
if (!label || !/^[a-z0-9][a-z0-9.-]{1,60}$/.test(label)) {
  console.error("Kullanım: pnpm license:keygen <etiket>  (küçük harf, rakam, nokta, tire)");
  process.exit(1);
}
const file = `license-${label}.private.pem`;
if (fs.existsSync(file)) {
  console.error(`${file} zaten var; üzerine yazılmadı.`);
  process.exit(1);
}
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
fs.writeFileSync(file, privateKey.export({ type: "pkcs8", format: "pem" }).toString(), { mode: 0o600 });
console.log(`Gizli anahtar: ${file} (paylaşmayın, depoya koymayın)`);
console.log("license-issuers.json girdisi:");
console.log(JSON.stringify({ label, keyId: keyIdOf(publicPem), publicKey: publicPem }, null, 2));
