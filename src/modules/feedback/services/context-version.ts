import { registry } from "@/registry";
import { findActiveModule } from "@/shared/navigation/module-nav";

/**
 * Formats the stored version context for a feedback submission by enriching the
 * root application version with the active module key and module version derived
 * from `pageUrl` (e.g. `0.41.0 · accounting@1.28.0`).
 */
export function formatFeedbackVersionContext(
  pageUrl: string | null | undefined,
  appVersion: string | null | undefined = process.env.npm_package_version ?? null,
): string | null {
  const base = appVersion?.trim() || null;
  if (!pageUrl) return base;

  let pathname = pageUrl.trim();
  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return base;
    }
  }
  const queryIdx = pathname.indexOf("?");
  const search = queryIdx >= 0 ? new URLSearchParams(pathname.slice(queryIdx + 1)) : undefined;
  const cleanPath = queryIdx >= 0 ? pathname.slice(0, queryIdx) : pathname;
  if (!cleanPath.startsWith("/")) return base;

  const active = findActiveModule(registry, cleanPath, search);
  if (!active) return base;

  const modTag = `${active.key}@${active.version}`;
  return base ? `${base} · ${modTag}` : modTag;
}
