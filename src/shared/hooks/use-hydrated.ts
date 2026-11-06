"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false during SSR and the hydration render, true afterwards. Use it to render
 * widgets whose generated ids differ between server and client (e.g. HeroUI
 * Select inside conditionally rendered siblings) only on the client.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
