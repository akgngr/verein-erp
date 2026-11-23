export type NotificationStreamOptions = {
  userId: string;
  signal: AbortSignal;
  getUnreadCount: (userId: string) => Promise<number>;
  subscribe: (userId: string, listener: () => void) => () => void;
  intervalMs?: number;
};

const DEFAULT_SYNC_INTERVAL_MS = 15_000;

/**
 * Creates a Server-Sent Events ReadableStream for a single authenticated user.
 * - Sends initial unread count on connect.
 * - Subscribes to in-process bus for zero-latency updates.
 * - Periodically polls getUnreadCount so notifications created out-of-process
 *   (e.g. automation worker or another web instance) still push count updates.
 */
export function createNotificationEventStream({
  userId,
  signal,
  getUnreadCount,
  subscribe,
  intervalMs = DEFAULT_SYNC_INTERVAL_MS,
}: NotificationStreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let isClosed = false;
      let lastCount: number | null = null;

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
        const initial = await getUnreadCount(userId);
        lastCount = initial;
        send("count", { count: initial });
      } catch {
        // Ignored; client can still fetch via action
      }

      // 2. Subscribe to local event bus for zero-latency in-process events
      const unsubscribeBus = subscribe(userId, async () => {
        if (isClosed) return;
        try {
          const count = await getUnreadCount(userId);
          lastCount = count;
          send("update", { count });
        } catch {
          send("update", {});
        }
      });

      // 3. Heartbeat and periodic sync (picks up out-of-process worker notifications)
      const interval = setInterval(async () => {
        if (isClosed) return;
        sendComment("keepalive");
        try {
          const current = await getUnreadCount(userId);
          if (lastCount !== current) {
            lastCount = current;
            send("count", { count: current });
          }
        } catch {
          // ignore periodic query errors
        }
      }, intervalMs);

      cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(interval);
        unsubscribeBus();
      };

      signal.addEventListener("abort", () => {
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
}
