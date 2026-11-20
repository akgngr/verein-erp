import issuersFile from "../../config/license-issuers.json";

import type { LicenseIssuer } from "./license";

/** Güvenilen lisans yayıncıları (src/config/license-issuers.json). Liste boşsa hiçbir lisans geçerli değildir. */
export function loadLicenseIssuers(): LicenseIssuer[] {
  const data = issuersFile as { issuers?: LicenseIssuer[] };
  return (data.issuers ?? []).filter((entry) => entry.keyId && entry.publicKey);
}
