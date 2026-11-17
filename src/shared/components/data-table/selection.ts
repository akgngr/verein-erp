import type { Key } from "react";

export function normalizeSelectedKeys(
  keys: "all" | Iterable<Key>,
  visibleIds: readonly string[],
): string[] {
  if (keys === "all") return [...visibleIds];
  return Array.from(keys, (key) => String(key));
}
