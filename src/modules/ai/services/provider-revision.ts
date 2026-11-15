import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/shared/db";

import { getCloudSettings } from "./cloud-settings";

/** Bind consent/proposals to the exact provider configuration, without including key material. */
export async function providerRevision(provider: string): Promise<string> {
  const row = await getDb().aiProviderCredential.findUnique({ where: { provider }, select: { provider: true, model: true, baseUrl: true, updatedAt: true } });
  // Bulut veri politikası değişince rıza yenilenir; yerel sağlayıcı bu ayardan etkilenmez.
  const cloud = provider === "local" ? null : await getCloudSettings();
  return createHash("sha256").update(JSON.stringify({ provider, configuration: row, policyVersion: 2, ...(cloud && (cloud.textMode !== "INTENTS" || cloud.pseudonymousRecords) ? { cloud } : {}) })).digest("hex");
}
