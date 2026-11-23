import { EventEmitter } from "node:events";

const bus = new EventEmitter();
// Allow multiple simultaneous SSE connections from the same user across tabs
bus.setMaxListeners(100);

const topic = (userId: string) => `user:${userId}`;

/**
 * In-process notification event bus for real-time SSE updates.
 * Safe: only carries the recipient's userId topic; zero payload or PII transmitted over the bus.
 */
export function emitNotificationUpdate(userId: string): void {
  bus.emit(topic(userId));
}

/**
 * Subscribes to notification updates for a specific authenticated user.
 * Returns an unsubscribe callback for clean disposal on disconnect.
 */
export function subscribeNotificationUpdates(userId: string, listener: () => void): () => void {
  const event = topic(userId);
  bus.on(event, listener);
  return () => {
    bus.off(event, listener);
  };
}
