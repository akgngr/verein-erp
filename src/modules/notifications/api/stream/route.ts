import { getCurrentUser } from "@/modules/auth/server";
import { can } from "@/shared/permissions/define";
import { notificationsPermissions } from "../../permissions";
import { unreadCount } from "../../services/inbox";
import { subscribeNotificationUpdates } from "../../services/stream-bus";

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

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const send = (event: string, data: Record<string, unknown> | string) => {
        if (isClosed) return;
        try {
          const payload = typeof data === "string" ? data : JSON.stringify(data);
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${payload}\n\n`));
        } catch {
          isClosed = true;
        }
      };

      const sendComment = (comment: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          isClosed = true;
        }
      };

      // 1. Send initial unread count on connection
      try {
        const initial = await unreadCount(user.id);
        send("count", { count: initial });
      } catch {
        // Ignored; client can still fetch via action
      }

      // 2. Subscribe to local event bus for zero-latency in-process events
      const unsubscribeBus = subscribeNotificationUpdates(user.id, async () => {
        if (isClosed) return;
        try {
          const count = await unreadCount(user.id);
          send("update", { count });
        } catch {
          send("update", {});
        }
      });

      // 3. Heartbeat and periodic sync (every 15s)
      let lastCount = -1;
      const interval = setInterval(async () => {
        if (isClosed) return;
        sendComment("keepalive");
        try {
          const current = await unreadCount(user.id);
          if (lastCount !== current) {
            lastCount = current;
            send("count", { count: current });
          }
        } catch {
          // ignore periodic query errors
        }
      }, 15_000);

      cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(interval);
        unsubscribeBus();
      };

      request.signal.addEventListener("abort", () => {
        cleanup?.();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup?.();
    },
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
