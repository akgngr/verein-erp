/**
 * Web Push client utilities (Issue #360 / ADR 0006)
 * Feature detection, iOS PWA detection, VAPID key conversion and subscription payload sanitization.
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isIos = /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIos;
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const isDisplayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isNavigatorStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isDisplayStandalone || isNavigatorStandalone;
}

export function getIosPushStatus(): { isIos: boolean; isStandalone: boolean; needsInstall: boolean } {
  const isIos = isIosDevice();
  const isStandalone = isStandalonePwa();
  return {
    isIos,
    isStandalone,
    needsInstall: isIos && !isStandalone,
  };
}

export type WebPushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

/**
 * PushSubscription.toJSON() outputs `{ endpoint, expirationTime, keys: { p256dh, auth } }`.
 * Server validation in subscriptionSchema is strict (no extra fields allowed).
 * This helper strips expirationTime and ensures clean payload format.
 */
export function toCleanSubscriptionPayload(subscription: PushSubscription): WebPushSubscriptionPayload | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}
