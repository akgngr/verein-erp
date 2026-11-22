"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button, Spinner, StatusChip } from "@/shared/components/kit";
import {
  getWebPushKeyAction,
  subscribeWebPushAction,
  unsubscribeWebPushAction,
} from "../actions/channels";
import {
  getIosPushStatus,
  isPushSupported,
  toCleanSubscriptionPayload,
  urlBase64ToUint8Array,
} from "./push-utils";

export type PushToggleProps = {
  initialPublicKey?: string | null;
  className?: string;
  compact?: boolean;
  onSubscriptionChange?: (isSubscribed: boolean) => void;
};

type PushStatus = "checking" | "disabled" | "unsupported" | "ios-needs-install" | "ready";

export function PushToggle({
  initialPublicKey,
  className,
  compact = false,
  onSubscriptionChange,
}: PushToggleProps) {
  const t = useTranslations("notifications.ui.push");
  const [status, setStatus] = useState<PushStatus>("checking");
  const [publicKey, setPublicKey] = useState<string | null>(initialPublicKey ?? null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync existing subscription status
  const checkCurrentSubscription = useCallback(async (currentKey: string) => {
    try {
      if (!isPushSupported()) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const subscribed = Boolean(sub);
      setIsSubscribed(subscribed);
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
      // Re-subscribe if browser subscription changed or re-synced
      if (sub && currentKey) {
        const payload = toCleanSubscriptionPayload(sub);
        if (payload) {
          await subscribeWebPushAction(payload);
        }
      }
    } catch {
      // Graceful error fallback: do not block UI
    }
  }, []);

  // Initialize push capabilities and key
  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (!isPushSupported()) {
        if (isMounted) setStatus("unsupported");
        return;
      }

      const iosStatus = getIosPushStatus();
      if (iosStatus.needsInstall) {
        if (isMounted) setStatus("ios-needs-install");
        return;
      }

      let activeKey = initialPublicKey;
      if (activeKey === undefined) {
        try {
          const res = await getWebPushKeyAction({});
          activeKey = res && res.ok ? res.data.publicKey : null;
        } catch {
          activeKey = null;
        }
      }

      if (!isMounted) return;

      if (!activeKey) {
        // Channel disabled on server: show nothing
        setStatus("disabled");
        setPublicKey(null);
        return;
      }

      setPublicKey(activeKey);
      setStatus("ready");

      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await checkCurrentSubscription(activeKey);
      } catch {
        // Service worker registration error in unsupported environments
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [checkCurrentSubscription, initialPublicKey]);

  // Listen to SW pushsubscriptionchange events
  useEffect(() => {
    if (!isPushSupported() || status !== "ready" || !publicKey) return;

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            const payload = toCleanSubscriptionPayload(sub);
            if (payload) {
              await subscribeWebPushAction(payload);
              setIsSubscribed(true);
              onSubscriptionChange?.(true);
            }
          }
        } catch {
          // Graceful catch
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [onSubscriptionChange, publicKey, status]);

  // Channel is disabled on server: render nothing
  if (status === "disabled") {
    return null;
  }

  // Unsupported browser fallback
  if (status === "unsupported") {
    if (compact) return null;
    return (
      <div className={className} role="status" aria-live="polite">
        <p className="text-xs text-foreground-muted">{t("unsupported")}</p>
      </div>
    );
  }

  // iOS PWA installation hint
  if (status === "ios-needs-install") {
    if (compact) return null;
    return (
      <div className={className} role="status" aria-live="polite">
        <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800 dark:border-warning-800/40 dark:bg-warning-950/30 dark:text-warning-300">
          {t("iosHint")}
        </div>
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`} aria-live="polite">
        <Spinner size="sm" aria-label={t("title")} />
      </div>
    );
  }

  // Handlers triggered solely by user gesture
  const handleSubscribe = async () => {
    if (!publicKey) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setIsLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const appServerKey = urlBase64ToUint8Array(publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as unknown as BufferSource,
      });

      const payload = toCleanSubscriptionPayload(sub);
      if (!payload) {
        throw new Error(t("error"));
      }

      const res = await subscribeWebPushAction(payload);
      if (!res.ok) {
        throw new Error(t("error"));
      }

      setIsSubscribed(true);
      onSubscriptionChange?.(true);
    } catch {
      setErrorMsg(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unsubscribeWebPushAction({ endpoint });
      }
      setIsSubscribed(false);
      onSubscriptionChange?.(false);
    } catch {
      setErrorMsg(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const isDenied = permission === "denied";

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
        <Button
          size="sm"
          variant={isSubscribed ? "outline" : "primary"}
          isDisabled={isLoading || isDenied}
          onPress={isSubscribed ? handleUnsubscribe : handleSubscribe}
          aria-label={isSubscribed ? t("disable") : t("enable")}
        >
          {isLoading ? (
            <Spinner size="sm" aria-label={isSubscribed ? t("unsubscribing") : t("subscribing")} />
          ) : isSubscribed ? (
            t("disable")
          ) : (
            t("enable")
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <StatusChip tone={isSubscribed ? "success" : "default"}>
            {isSubscribed ? t("enabled") : t("disabled")}
          </StatusChip>
          {isDenied && (
            <span className="text-xs text-danger" role="alert">
              {t("denied")}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={isSubscribed ? "outline" : "primary"}
          isDisabled={isLoading || isDenied}
          onPress={isSubscribed ? handleUnsubscribe : handleSubscribe}
          aria-label={isSubscribed ? t("disable") : t("enable")}
        >
          {isLoading ? (
            <Spinner size="sm" aria-label={isSubscribed ? t("unsubscribing") : t("subscribing")} />
          ) : isSubscribed ? (
            t("disable")
          ) : (
            t("enable")
          )}
        </Button>
      </div>
      {errorMsg && (
        <p className="text-xs text-danger" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
