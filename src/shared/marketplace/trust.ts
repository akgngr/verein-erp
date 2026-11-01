import trustedFile from "../../config/trusted-publishers.json";

import type { TrustedPublisher } from "./package";

/**
 * Güvenilen yayıncılar: src/config/trusted-publishers.json (yalnızca kod incelemesiyle değişir).
 * Statik import: derlenmiş uygulamada da (standalone) aynı liste kullanılır.
 */
export function loadTrustedPublishers(): TrustedPublisher[] {
  const data = trustedFile as { publishers?: TrustedPublisher[] };
  return (data.publishers ?? []).filter((entry) => entry.publisher && entry.keyId && entry.publicKey);
}
