import fs from "node:fs";
import path from "node:path";

import type { TrustedPublisher } from "./package";

/** Güvenilen yayıncılar: src/config/trusted-publishers.json (yalnızca kod incelemesiyle değişir). */
export function loadTrustedPublishers(root = process.cwd()): TrustedPublisher[] {
  const file = path.join(root, "src", "config", "trusted-publishers.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as { publishers?: TrustedPublisher[] };
  return (data.publishers ?? []).filter((entry) => entry.publisher && entry.keyId && entry.publicKey);
}
