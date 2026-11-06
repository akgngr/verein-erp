import "server-only";

import { headers } from "next/headers";

/** Public origin the user reached us on (proxy-aware); never the internal request URL. */
export async function publicOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  if (!host) throw new Error("SYNC_NO_HOST");
  return `${proto}://${host}`;
}
