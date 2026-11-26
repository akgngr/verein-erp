"use client";

import { useSyncExternalStore } from "react";

/** Açık kipli katman: diyalog, çekmece (drawer) veya uyarı diyaloğu. */
const OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"]';

function subscribe(onChange: () => void): () => void {
  let frame = 0;
  const observer = new MutationObserver(() => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      onChange();
    });
  });
  // Diyaloglar portal ile body'ye eklenir; yalnızca düğüm ekleme/çıkarma izlenir.
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
  };
}

/**
 * #586: Sayfada açık bir diyalog/çekmece var mı? Yüzen düğmeler (AI çubuğu, geri bildirim) açıkken gizlenir;
 * böylece kaydet/gönder düğmelerinin üstünü örtmezler. Sunucuda ve ilk hidrasyonda false döner.
 */
export function useOverlayOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.querySelector(OVERLAY_SELECTOR) !== null,
    () => false,
  );
}
