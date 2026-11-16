"use client";

import { useSyncExternalStore } from "react";

/**
 * CSS medya sorgusunu izler. Sunucuda ve ilk hidrasyonda `serverValue` döner (varsayılan false),
 * böylece sunucu ve istemci ilk çizimi aynı olur; ardından gerçek değere geçer.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Tailwind `sm` kırılımı (640 px) ve üstü: masaüstü/tablet yerleşimi. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 640px)", true);
}

/** Çekmece yönü: masaüstünde sağdan, mobilde alttan (bottom sheet). */
export function useDrawerPlacement(): "right" | "bottom" {
  return useIsDesktop() ? "right" : "bottom";
}
