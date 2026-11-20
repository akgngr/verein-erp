/** S4–S5 presentation contract. Only permission-filtered, minimized server projections may be passed to UI. */
export type AdvancedSecretaryKind =
  | "mail-triage"
  | "follow-up"
  | "weekly-report"
  | "ocr-suggestion"
  | "channel-consent"
  | "delegation";

export type AdvancedSecretaryStatus = "draft" | "needs-review" | "paused" | "complete";

export type AdvancedSecretaryItem = {
  id: string;
  kind: AdvancedSecretaryKind;
  status: AdvancedSecretaryStatus;
  /** Localized, already permission-filtered display strings. Never encrypted payload or raw mail/document data. */
  title: string;
  description?: string;
  /** A same-origin application route with its own authorization guard; no external URLs or URL parameters. */
  sourceHref?: string;
  requiresApproval: boolean;
};

const KINDS = new Set<AdvancedSecretaryKind>([
  "mail-triage", "follow-up", "weekly-report", "ocr-suggestion", "channel-consent", "delegation",
]);

const STATUSES = new Set<AdvancedSecretaryStatus>(["draft", "needs-review", "paused", "complete"]);

/** Fail closed: no protocol-relative, encoded traversal, query/fragment, controls or redirect-like URLs. */
export function isSafeSecretaryRoute(href: unknown): href is string {
  if (typeof href !== "string" || href.length < 2 || href.length > 512) return false;
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  if (/[\\\\?#%<>\x00-\x20]/.test(href)) return false;
  if (href.split("/").some((segment) => segment === "." || segment === "..")) return false;
  return true;
}

/** A defense-in-depth boundary for frontend rendering; service must independently enforce authorization. */
export function safeAdvancedItem(raw: AdvancedSecretaryItem): AdvancedSecretaryItem | null {
  if (!KINDS.has(raw.kind) || !STATUSES.has(raw.status)) return null;
  if (!/^[a-z0-9][a-z0-9:_-]{0,127}$/.test(raw.id)) return null;
  if (!raw.title.trim() || raw.title.length > 160 || (raw.description?.length ?? 0) > 350) return null;
  return {
    id: raw.id,
    kind: raw.kind,
    status: raw.status,
    title: raw.title,
    ...(raw.description ? { description: raw.description } : {}),
    ...(isSafeSecretaryRoute(raw.sourceHref) ? { sourceHref: raw.sourceHref } : {}),
    requiresApproval: raw.requiresApproval === true,
  };
}

export function filterAdvancedItems(items: readonly AdvancedSecretaryItem[]): AdvancedSecretaryItem[] {
  const visible: AdvancedSecretaryItem[] = [];
  for (const item of items) {
    const safe = safeAdvancedItem(item);
    if (safe) visible.push(safe);
    if (visible.length === 100) break;
  }
  return visible;
}
