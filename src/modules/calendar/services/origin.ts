import "server-only";

import { headers } from "next/headers";

import { resolvePublicOrigin } from "@/shared/security/public-origin";

/** Canonical public origin (APP_URL in production, local loopback only in dev/test). */
export async function publicOrigin(): Promise<string> {
  const origin = resolvePublicOrigin(await headers());
  return origin ?? "http://localhost:3000";
}
