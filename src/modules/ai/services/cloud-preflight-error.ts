import type { FindingKind } from "./cloud-preflight";

/** Denetimli bulut modunda mesaj kişisel veri içerdiği için gönderilmedi (metin taşımaz, yalnız türler). */
export class CloudPreflightError extends Error {
  constructor(readonly kinds: FindingKind[]) {
    super("AI_CLOUD_PREFLIGHT_BLOCKED");
  }
}
