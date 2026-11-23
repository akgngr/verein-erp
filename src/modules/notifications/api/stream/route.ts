import { getCurrentUser } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import { notificationsPermissions } from "../../permissions";
import { unreadCount } from "../../services/inbox";
import { subscribeNotificationUpdates } from "../../services/stream-bus";
import { createNotificationEventStream } from "../../services/stream-sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * N7 (#364): Server-Sent Events stream for instant notification updates.
 * - Authenticated per user; strictly isolated to user.id (never sends other users' data).
 * - Transmits only lightweight event signals and counts (zero PII, zero raw payloads).
 * - Keep-alive heartbeats prevent timeout; client falls back gracefully on drop.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!can(user.role, notificationsPermissions, "view")) {
    return new Response(JSON.stringify({ ok: false, error: "FORBIDDEN" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = createNotificationEventStream({
    userId: user.id,
    signal: request.signal,
    getUnreadCount: unreadCount,
    subscribe: subscribeNotificationUpdates,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
