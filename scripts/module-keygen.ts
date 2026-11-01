/**
 * pnpm module:keygen <yayıncı> — modül yayıncısı için Ed25519 anahtar çifti üretir.
 *   <yayıncı>.private.pem → GİZLİ tutun (depoya koymayın); paket imzalamak için.
 *   Çıktıdaki JSON satırını src/config/trusted-publishers.json → publishers'a ekleyin (kod incelemesiyle).
 */
import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";

import { keyIdOf } from "../src/shared/marketplace/package";

const publisher = process.argv[2];
if (!publisher || !/^[a-z0-9][a-z0-9.-]{1,60}$/.test(publisher)) {
  console.error("Kullanım: pnpm module:keygen <yayıncı-adı>  (küçük harf, rakam, nokta, tire)");
  process.exit(1);
}
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const file = `${publisher}.private.pem`;
if (fs.existsSync(file)) {
  console.error(`${file} zaten var; üzerine yazılmadı.`);
  process.exit(1);
}
fs.writeFileSync(file, privatePem, { mode: 0o600 });
console.log(`Gizli anahtar: ${file} (paylaşmayın, depoya koymayın)`);
console.log("trusted-publishers.json girdisi:");
console.log(JSON.stringify({ publisher, keyId: keyIdOf(publicPem), publicKey: publicPem }, null, 2));
