import { registry } from "@/registry";

function extractPathname(pageUrl: string): string | null {
  const trimmed = pageUrl.trim();
  if (!trimmed) return null;
  let pathname = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  } else if (!trimmed.startsWith("/")) {
    return null;
  }
  const withoutLocale = pathname.replace(/^\/(tr|de)(?=\/|$)/, "") || "/";
  return withoutLocale;
}

export function resolveModuleContextFromUrl(
  pageUrl: string | null | undefined,
): { key: string; version: string } | null {
  if (!pageUrl) return null;
  const pathname = extractPathname(pageUrl);
  if (!pathname) return null;

  let best: { key: string; version: string; len: number } | null = null;
  for (const mod of registry) {
    const candidates = [
      ...(mod.nav?.map((n) => n.href) ?? []),
      ...(mod.menu?.map((m) => m.href) ?? []),
    ];
    for (const href of candidates) {
      if (!href) continue;
      if (pathname === href || pathname.startsWith(`${href}/`)) {
        if (!best || href.length > best.len) {
          best = { key: mod.key, version: mod.version ?? "0.0.0", len: href.length };
        }
      }
    }
  }
  return best ? { key: best.key, version: best.version } : null;
}

export function resolveFeedbackAppVersion(
  pageUrl: string | null | undefined,
  baseVersion: string | null | undefined,
): string | null {
  const ctx = resolveModuleContextFromUrl(pageUrl);
  if (!ctx) return baseVersion ?? null;
  const app = baseVersion?.trim() || "app";
  return `${app} (${ctx.key}@${ctx.version})`;
}
