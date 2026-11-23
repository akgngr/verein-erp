"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  listNotificationsAction, markAllNotificationsReadAction, markNotificationsReadAction,
  snoozeNotificationAction, unreadNotificationCountAction,
} from "../actions/inbox";
import type { NotificationView } from "../services/inbox";
import { NotificationBellDrawer } from "../components/notification-bell-drawer";

const POLL_MS = 30_000;

/** Authenticated, server-filtered inbox; no client-side privileged database access. */
export function NotificationInboxWidget() {
  const t = useTranslations("notifications");
  const [items, setItems] = useState<NotificationView[]>([]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  // Ignore responses from older polls after a newer reload or an unmount.
  const requestId = useRef(0);
  // A timer must not start a fresh read while a write is in progress.
  const mutationInFlight = useRef(false);

  const reload = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      const [list, unread] = await Promise.all([
        listNotificationsAction({ unreadOnly: false, limit: 50 }),
        unreadNotificationCountAction({}),
      ]);
      if (currentRequest !== requestId.current) return false;
      if (!list.ok || !unread.ok) { setItems([]); setCount(0); setUnavailable(true); return false; }
      setItems(list.data);
      setCount(unread.data.count);
      setUnavailable(false);
      return true;
    } catch {
      if (currentRequest !== requestId.current) return false;
      setItems([]);
      setCount(0);
      setUnavailable(true);
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let eventSource: EventSource | null = null;
    let sseActive = false;

    const poll = () => {
      if (mounted && !mutationInFlight.current && document.visibilityState === "visible") {
        void reload();
      }
    };

    // Polling fallback interval: runs when SSE is unavailable, disconnected, or on error
    const interval = window.setInterval(() => {
      if (!sseActive) poll();
    }, POLL_MS);

    const connectSSE = () => {
      if (typeof EventSource === "undefined" || document.visibilityState !== "visible") {
        sseActive = false;
        return;
      }

      try {
        eventSource = new EventSource("/api/notifications/stream");

        eventSource.onopen = () => {
          sseActive = true;
        };

        eventSource.addEventListener("count", (event) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(event.data);
            if (typeof data.count === "number") {
              setCount(data.count);
              setUnavailable(false);
            }
          } catch {
            void reload();
          }
        });

        eventSource.addEventListener("update", () => {
          if (!mounted || mutationInFlight.current) return;
          void reload();
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          sseActive = false;
        };
      } catch {
        sseActive = false;
      }
    };

    const disconnectSSE = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      sseActive = false;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        poll();
        if (!sseActive) connectSSE();
      } else {
        disconnectSSE();
      }
    };

    poll();
    connectSSE();

    document.addEventListener("visibilitychange", poll);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      mounted = false;
      const req = requestId;
      req.current++;
      disconnectSSE();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reload]);

  const act = async (fn: () => Promise<{ ok: boolean }>) => {
    if (mutationInFlight.current || unavailable) return;
    mutationInFlight.current = true;
    // A poll started before this mutation must not overwrite its result.
    requestId.current++;
    setBusy(true);
    try {
      const result = await fn();
      if (!result.ok) { setItems([]); setCount(0); setUnavailable(true); throw new Error("NOTIFICATION_ACTION_FAILED"); }
      if (!(await reload())) throw new Error("NOTIFICATION_REFRESH_FAILED");
    } catch {
      setItems([]);
      setCount(0);
      setUnavailable(true);
      throw new Error("NOTIFICATION_ACTION_FAILED");
    } finally {
      mutationInFlight.current = false;
      setBusy(false);
    }
  };

  return <NotificationBellDrawer
    labels={{
      open: t("ui.open"), heading: t("ui.heading"), all: t("ui.all"),
      unread: t("ui.unread"), empty: t("ui.empty"),
      markRead: t("ui.markRead"), markAllRead: t("ui.markAllRead"),
      snooze: t("ui.snooze"), settings: t("ui.settings"),
      unavailable: t("ui.unavailable"), module: t("ui.module"),
    }}
    unreadCount={count}
    items={items.map((item) => ({
      id: item.id, title: item.title, createdLabel: item.createdAt.slice(0, 10),
      moduleLabel: item.moduleKey, href: item.href, unread: !item.read,
    }))}
    busy={busy}
    unavailable={unavailable}
    onRead={(id) => act(() => markNotificationsReadAction({ ids: [id] }))}
    onReadAll={() => act(() => markAllNotificationsReadAction({}))}
    onSnooze={(id) => act(() => snoozeNotificationAction({
      id, until: new Date(Date.now() + 86_400_000).toISOString(),
    }))}
  />;
}
