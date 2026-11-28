"use client";

import { ArrowRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { registry } from "@/registry";
import { Button } from "@/shared/components/kit";
import { can } from "@/shared/permissions/define";

const OPEN_EVENT = "verein:open-quick-search";

export function openQuickSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  }
}

export function QuickSearchTrigger({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("search");
  if (compact) {
    return (
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={t("triggerLabel")}
        onPress={openQuickSearch}
        className="text-ink-500"
      >
        <Search className="h-4 w-4" aria-hidden />
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      onPress={openQuickSearch}
      className="h-8 gap-2 border-ink-200 px-2.5 text-xs text-ink-500 hover:text-foreground"
      aria-label={t("triggerLabel")}
    >
      <Search className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden xl:inline">{t("triggerShort")}</span>
      <kbd className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
        ⌘K
      </kbd>
    </Button>
  );
}

type SearchCandidate = {
  id: string;
  kind: "route" | "record";
  title: string;
  subtitle: string;
  href: string;
};

export function QuickSearchPalette({
  role,
  activeModuleKeys,
}: {
  role: string;
  activeModuleKeys: readonly string[];
}) {
  const t = useTranslations("search");
  const tRoot = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<SearchCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const routeItems = useMemo<SearchCandidate[]>(() => {
    const activeSet = new Set(activeModuleKeys);
    const list: SearchCandidate[] = [];
    for (const mod of registry) {
      if (!activeSet.has(mod.key)) continue;
      for (const nav of mod.nav ?? []) {
        if (nav.hidden) continue;
        if (nav.permission && !can(role, nav.permission.definition, nav.permission.action)) {
          continue;
        }
        const label =
          nav.labelKey && tRoot.has(`nav.${nav.labelKey}`)
            ? tRoot(`nav.${nav.labelKey}`)
            : nav.label;
        list.push({
          id: `route:${mod.key}:${nav.href}`,
          kind: "route",
          title: label,
          subtitle: mod.label,
          href: nav.href,
        });
      }
      for (const item of mod.menu ?? []) {
        if (item.module && !activeSet.has(item.module)) continue;
        if (item.permission && !can(role, item.permission.definition, item.permission.action)) {
          continue;
        }
        list.push({
          id: `menu:${mod.key}:${item.href}`,
          kind: "route",
          title: item.label,
          subtitle: mod.label,
          href: item.href,
        });
      }
    }
    return list;
  }, [activeModuleKeys, role, tRoot]);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routeItems.slice(0, 8);
    return routeItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [query, routeItems]);

  const allItems = useMemo(
    () => [...filteredRoutes, ...records],
    [filteredRoutes, records],
  );

  const closePalette = () => {
    setOpen(false);
    setQuery("");
    setRecords([]);
    setActiveIndex(0);
    setLoading(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => {
          if (prev) {
            setQuery("");
            setRecords([]);
            setActiveIndex(0);
            setLoading(false);
            return false;
          }
          return true;
        });
      } else if (event.key === "Escape") {
        closePalette();
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setRecords([]);
          return;
        }
        const data = (await res.json()) as {
          ok: boolean;
          results?: { id: string; module: string; title: string; subtitle: string; href: string }[];
        };
        if (data.ok && Array.isArray(data.results)) {
          setRecords(
            data.results.map((r) => ({
              id: r.id,
              kind: "record",
              title: r.title,
              subtitle: r.subtitle
                ? `${t(`modules.${r.module}`)} · ${r.subtitle}`
                : t(`modules.${r.module}`),
              href: r.href,
            })),
          );
          setActiveIndex(0);
        }
      } catch {
        // Ignore aborted fetches
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, t]);

  if (!open) return null;

  const navigate = (href: string) => {
    closePalette();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-xs motion-reduce:transition-none"
      role="dialog"
      aria-modal="true"
      aria-label={t("dialogLabel")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closePalette();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-ink-200 bg-surface shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-ink-200 px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              setActiveIndex(0);
              if (next.trim().length < 2) {
                setRecords([]);
                setLoading(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => (allItems.length ? (i + 1) % allItems.length : 0));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) =>
                  allItems.length ? (i - 1 + allItems.length) % allItems.length : 0,
                );
              } else if (e.key === "Enter" && allItems[activeIndex]) {
                e.preventDefault();
                navigate(allItems[activeIndex].href);
              }
            }}
            placeholder={t("placeholder")}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-ink-400"
          />
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            aria-label={t("close")}
            onPress={closePalette}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-2 text-xs text-ink-500">{t("searching")}</p>
          ) : null}

          {!loading && allItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-500">{t("empty")}</p>
          ) : null}

          {allItems.map((item, idx) => {
            const selected = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => navigate(item.href)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors motion-reduce:transition-none ${
                  selected
                    ? "bg-brand-50 text-brand-900 dark:bg-brand-950/50 dark:text-brand-100"
                    : "text-foreground hover:bg-ink-100"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.title}</div>
                  <div className="truncate text-xs text-ink-500">{item.subtitle}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
