import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";

import { getDb } from "@/shared/db";
import { createPgClient } from "@/shared/db-client";

export const NOTIFICATION_PG_CHANNEL = "verein_notifications";

const SAFE_TOKEN = /^[A-Za-z0-9_-]{1,64}$/;
const INSTANCE_ID = randomBytes(6).toString("hex");
const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;
const IDLE_CLOSE_MS = 30_000;

const bus = new EventEmitter();
// Allow multiple simultaneous SSE connections from the same user across tabs
bus.setMaxListeners(100);

const topic = (userId: string) => `user:${userId}`;

/**
 * Encodes a cross-process Postgres NOTIFY payload carrying only the sender instance ID
 * and recipient userId (strictly zero PII or notification content).
 */
export function encodePgNotificationPayload(
  instanceId: string,
  userId: string,
): string | null {
  if (!SAFE_TOKEN.test(instanceId) || !SAFE_TOKEN.test(userId)) return null;
  return `${instanceId}:${userId}`;
}

/**
 * Decodes an incoming Postgres NOTIFY payload, returning the target userId only when
 * it originated from another process (avoiding duplicate local echo delivery).
 */
export function decodePgNotificationPayload(
  payload: string | undefined,
  selfInstanceId: string = INSTANCE_ID,
): string | null {
  if (!payload) return null;
  const colon = payload.indexOf(":");
  if (colon <= 0 || colon === payload.length - 1) return null;
  const senderId = payload.slice(0, colon);
  const userId = payload.slice(colon + 1);
  if (!SAFE_TOKEN.test(senderId) || !SAFE_TOKEN.test(userId)) return null;
  if (senderId === selfInstanceId) return null;
  return userId;
}

type PgListenerClient = ReturnType<typeof createPgClient>;

let pgClient: PgListenerClient | null = null;
let connecting = false;
let activeSubscribers = 0;
let reconnectDelayMs = MIN_RECONNECT_MS;
let reconnectTimer: NodeJS.Timeout | null = null;
let idleCloseTimer: NodeJS.Timeout | null = null;

function clearTimers(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
}

async function closePgListener(): Promise<void> {
  const client = pgClient;
  pgClient = null;
  connecting = false;
  if (!client) return;
  try {
    await client.end();
  } catch {
    // Ignore cleanup errors on already-closed sockets.
  }
}

function scheduleReconnect(): void {
  if (activeSubscribers <= 0 || reconnectTimer || !(process.env.DIRECT_URL || process.env.DATABASE_URL)) return;
  const delay = reconnectDelayMs;
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_MS);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void ensurePgListener();
  }, delay);
  reconnectTimer.unref();
}

async function ensurePgListener(): Promise<void> {
  if (pgClient || connecting || activeSubscribers <= 0) return;
  // LISTEN needs a persistent session: a transaction pooler (Neon/PgBouncer DATABASE_URL) drops it,
  // so prefer the direct connection, as prisma.config.ts does for migrations.
  const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!rawUrl) return;

  connecting = true;
  const client = createPgClient(rawUrl);
  try {
    client.on("notification", (msg) => {
      if (msg.channel !== NOTIFICATION_PG_CHANNEL) return;
      const remoteUserId = decodePgNotificationPayload(msg.payload, INSTANCE_ID);
      if (remoteUserId) {
        bus.emit(topic(remoteUserId));
      }
    });

    const handleDisconnect = () => {
      if (pgClient === client) {
        pgClient = null;
      }
      connecting = false;
      scheduleReconnect();
    };

    client.on("error", handleDisconnect);
    client.on("end", handleDisconnect);

    await client.connect();
    await client.query(`LISTEN ${NOTIFICATION_PG_CHANNEL}`);

    if (activeSubscribers <= 0) {
      await client.end().catch(() => {});
      connecting = false;
      return;
    }

    pgClient = client;
    connecting = false;
    reconnectDelayMs = MIN_RECONNECT_MS;
  } catch {
    connecting = false;
    await client.end().catch(() => {});
    scheduleReconnect();
  }
}

/**
 * Cross-process notification event bus for real-time SSE updates.
 * - Immediately fans out to in-process SSE subscribers.
 * - Broadcasts `instanceId:userId` via PostgreSQL `pg_notify` so notifications created
 *   in the automation worker or another web replica arrive live without polling delay.
 * Safe: carries only opaque IDs; zero payload or PII is transmitted over the bus.
 */
export function emitNotificationUpdate(userId: string): void {
  bus.emit(topic(userId));

  if (!process.env.DATABASE_URL) return;
  const payload = encodePgNotificationPayload(INSTANCE_ID, userId);
  if (!payload) return;

  void getDb()
    .$executeRaw`SELECT pg_notify(${NOTIFICATION_PG_CHANNEL}, ${payload})`
    .catch(() => {
      // Best-effort cross-process push; 15s SSE DB poll remains fallback.
    });
}

/**
 * Subscribes to notification updates for a specific authenticated user.
 * Lazy-starts the shared PostgreSQL LISTEN connection while subscribers are active.
 * Returns an unsubscribe callback for clean disposal on disconnect.
 */
export function subscribeNotificationUpdates(
  userId: string,
  listener: () => void,
): () => void {
  const event = topic(userId);
  bus.on(event, listener);
  activeSubscribers += 1;
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
  void ensurePgListener();

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    bus.off(event, listener);
    activeSubscribers = Math.max(0, activeSubscribers - 1);
    if (activeSubscribers === 0) {
      clearTimers();
      idleCloseTimer = setTimeout(() => {
        idleCloseTimer = null;
        if (activeSubscribers === 0) {
          void closePgListener();
        }
      }, IDLE_CLOSE_MS);
      idleCloseTimer.unref();
    }
  };
}
