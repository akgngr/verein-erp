import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

import { Client, Pool } from "pg";

export const NOTIFICATION_PG_CHANNEL = "verein_notifications";
const INSTANCE_ID = randomUUID().replace(/-/g, "").slice(0, 12);

const bus = new EventEmitter();
// Allow multiple simultaneous SSE connections from the same user across tabs
bus.setMaxListeners(200);

const topic = (userId: string) => `user:${userId}`;

export function encodeNotificationPayload(instanceId: string, userId: string): string {
  return `${instanceId}:${userId}`;
}

export function decodeNotificationPayload(
  payload: string,
): { instanceId: string; userId: string } | null {
  const sep = payload.indexOf(":");
  if (sep <= 0 || sep >= payload.length - 1) return null;
  return {
    instanceId: payload.slice(0, sep),
    userId: payload.slice(sep + 1),
  };
}

function getUsableDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.includes("unused/never-connected")) return null;
  return url;
}

let activeSubscribers = 0;
let listenerClient: Client | null = null;
let listenerConnecting = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let notifyPool: Pool | null = null;

function getNotifyPool(): Pool | null {
  const url = getUsableDatabaseUrl();
  if (!url) return null;
  if (!notifyPool) {
    notifyPool = new Pool({ connectionString: url, max: 2 });
    notifyPool.on("error", () => undefined);
  }
  return notifyPool;
}

function scheduleReconnect() {
  if (activeSubscribers <= 0 || reconnectTimer || !getUsableDatabaseUrl()) return;
  const delay = Math.min(1000 * 2 ** reconnectAttempt, 30_000);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void ensurePgListener();
  }, delay);
  reconnectTimer.unref?.();
}

async function teardownPgListener() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const client = listenerClient;
  listenerClient = null;
  if (client) {
    await client.end().catch(() => undefined);
  }
}

async function ensurePgListener(): Promise<void> {
  if (activeSubscribers <= 0 || listenerClient || listenerConnecting) return;
  const url = getUsableDatabaseUrl();
  if (!url) return;

  listenerConnecting = true;
  const client = new Client({ connectionString: url });
  try {
    client.on("notification", (msg) => {
      if (msg.channel !== NOTIFICATION_PG_CHANNEL || !msg.payload) return;
      const parsed = decodeNotificationPayload(msg.payload);
      if (!parsed || parsed.instanceId === INSTANCE_ID) return;
      bus.emit(topic(parsed.userId));
    });
    client.on("error", () => {
      if (listenerClient === client) listenerClient = null;
      void client.end().catch(() => undefined);
      scheduleReconnect();
    });
    client.on("end", () => {
      if (listenerClient === client) {
        listenerClient = null;
        scheduleReconnect();
      }
    });

    await client.connect();
    await client.query(`LISTEN ${NOTIFICATION_PG_CHANNEL}`);
    if (activeSubscribers <= 0) {
      await client.end().catch(() => undefined);
      return;
    }
    listenerClient = client;
    reconnectAttempt = 0;
  } catch {
    await client.end().catch(() => undefined);
    scheduleReconnect();
  } finally {
    listenerConnecting = false;
  }
}

/**
 * Cross-process notification event bus for real-time SSE updates.
 * Uses local EventEmitter for zero-latency in-process delivery and PostgreSQL LISTEN/NOTIFY
 * for cross-process fanout. Zero PII: only instanceId:userId is transmitted.
 */
export function emitNotificationUpdate(userId: string): void {
  bus.emit(topic(userId));
  const pool = getNotifyPool();
  if (!pool) return;
  const payload = encodeNotificationPayload(INSTANCE_ID, userId);
  void pool.query("SELECT pg_notify($1, $2)", [NOTIFICATION_PG_CHANNEL, payload]).catch(() => undefined);
}

/**
 * Subscribes to notification updates for a specific authenticated user.
 * Lazy-starts PG LISTEN on first subscriber and tears down when last subscriber leaves.
 */
export function subscribeNotificationUpdates(userId: string, listener: () => void): () => void {
  const event = topic(userId);
  bus.on(event, listener);
  activeSubscribers += 1;
  void ensurePgListener();

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    bus.off(event, listener);
    activeSubscribers = Math.max(0, activeSubscribers - 1);
    if (activeSubscribers === 0) {
      void teardownPgListener();
    }
  };
}
