import { NextResponse } from "next/server";

import { requirePermission } from "@/modules/auth/server";

import { calendarPermissions } from "../../../../permissions";
import { publicOrigin } from "../../../../services/origin";
import { completeOAuth, syncAccount } from "../../../../services/sync";

/**
 * GET /api/calendar/sync/callback/<provider>?state=…&code=… — OAuth return.
 * Session required; the one-time state must belong to the signed-in user.
 * The user always lands back on /calendar with a short result flag.
 */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const origin = await publicOrigin();
  const back = new URL("/calendar", origin);
  let userId: string;
  try {
    userId = (await requirePermission(calendarPermissions, "view")).id;
  } catch {
    return NextResponse.redirect(new URL("/giris", origin));
  }
  const { provider } = await params;
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  if (!/^[a-z0-9-]{1,40}$/.test(provider) || !state || !code || url.searchParams.has("error")) {
    back.searchParams.set("sync", "error");
    return NextResponse.redirect(back);
  }
  try {
    const accountId = await completeOAuth(userId, provider, state, code, origin);
    await syncAccount(accountId);
    back.searchParams.set("sync", "connected");
  } catch (error) {
    console.warn(`[calendar-sync] callback ${provider}:`, error instanceof Error ? error.message.slice(0, 80) : "failed");
    back.searchParams.set("sync", "error");
  }
  return NextResponse.redirect(back);
}
