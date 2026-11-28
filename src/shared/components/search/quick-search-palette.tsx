"use client";

import { ArrowRight, Compass, FileSearch, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { registry } from "@/registry";
import { Button, Spinner } from "@/shared/components/kit";
import type { Role } from "@/shared/roles";
import { collectQuickSearchNavItems } from "@/shared/search/nav-items";
import {
  filterQuickSearchItems,
  type QuickSearchApiResponse,
  type QuickSearchItem,
} from "@/shared/search/types";

interface QuickSearchContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  disabled: boolean;
}

const QuickSearchContext = createContext<QuickSearchContextValue>({
  open: false,
  setOpen: () => {},
  disabled: true,
});

export function useQuickSearch() {
  return useContext(QuickSearchContext);
}

/**
 * Trigger button for Desktop WorkspaceHeader (pill with ⌘K/Ctrl+K hint)
 * and MobileHeader (compact icon button).
 */
export function QuickSearchTrigger({ compact = false }: { compact?: boolean }) {
  const { setOpen, disabled } = useQuickSearch();
  const t = useTranslations("quickSearch");
  if (disabled) return null;

  if (compact) {
    return (
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={t("triggerAria")}
        className="text-ink-500"
        onPress={() => setOpen(true)}
      >
        <Search className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t("triggerAria")}
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-ink-200/80 bg-surface-muted/60 px-2.5 text-xs text-ink-500 transition-colors hover:border-ink-300 hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="hidden xl:inline">{t("trigger")}</span>
      <kbd className="rounded border border-ink-200 bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-500">
        {t("shortcut")}
      </kbd>
    </button>
  );
}

/**
 * Global Ctrl/Cmd+K quick-search palette provider mounted once in DashboardLayout.
 * Searches permitted module navigation routes instantly and queries `/api/search`
 * with debounced, abortable requests for live records.
 */
export function QuickSearchProvider({
  role,
  activeModuleKeys,
  disabled = false,
  children,
}: {
  role: Role;
  activeModuleKeys: readonly string[];
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled]);

  const value = useMemo(
    () => ({ open, setOpen, disabled }),
    [open, disabled],
  );

  return (
    <QuickSearchContext.Provider value={value}>
      {children}
      {!disabled && open ? (
        <QuickSearchDialog
          role={role}
          activeModuleKeys={activeModuleKeys}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </QuickSearchContext.Provider>
  );
}

function QuickSearchDialog({
  role,
  activeModuleKeys,
  onClose,
}: {
  role: Role;
  activeModuleKeys: readonly string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const t = useTranslations();
  const tSearch = useTranslations("quickSearch");
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    forQuery: string;
    items: QuickSearchItem[];
  }>({ forQuery: "", items: [] });
  const [activeIndex, setActiveIndex] = useState(0);

  // Build permitted navigation items from active modules (same visibility rules as the sidebar).
  const navItems = useMemo<QuickSearchItem[]>(
    () =>
      collectQuickSearchNavItems({
        modules: registry,
        activeModuleKeys,
        role,
        labels: {
          panel: t("nav.panel"),
          nav: (_mod, nav) =>
            nav.labelKey && t.has(`nav.${nav.labelKey}`) ? t(`nav.${nav.labelKey}`) : nav.label,
          menu: (mod, sub) =>
            t.has(`${mod.key}.menu.${sub.key}`) ? t(`${mod.key}.menu.${sub.key}`) : sub.label,
          module: (mod) =>
            t.has(`${mod.key}.module.label`) ? t(`${mod.key}.module.label`) : mod.label,
        },
      }),
    [activeModuleKeys, role, t],
  );

  const matchedPages = useMemo(
    () => filterQuickSearchItems(navItems, query, 8),
    [navItems, query],
  );

  const trimmedQuery = query.trim();

  // Debounced live record search against /api/search when query >= 2 chars.
  useEffect(() => {
    if (trimmedQuery.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setSearchResult({ forQuery: trimmedQuery, items: [] });
        } else {
          const json = (await res.json()) as QuickSearchApiResponse;
          setSearchResult({
            forQuery: trimmedQuery,
            items: Array.isArray(json.items) ? json.items : [],
          });
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError" && !controller.signal.aborted) {
          setSearchResult({ forQuery: trimmedQuery, items: [] });
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  const records = useMemo(
    () =>
      trimmedQuery.length >= 2 && searchResult.forQuery === trimmedQuery
        ? searchResult.items
        : [],
    [trimmedQuery, searchResult],
  );
  const loading = trimmedQuery.length >= 2 && searchResult.forQuery !== trimmedQuery;

  const flatItems = useMemo(
    () => [...matchedPages, ...records],
    [matchedPages, records],
  );
  const safeActiveIndex =
    flatItems.length > 0 ? Math.min(activeIndex, flatItems.length - 1) : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const selectItem = useCallback(
    (item: QuickSearchItem) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatItems.length > 0) {
        setActiveIndex((idx) => (idx + 1) % flatItems.length);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatItems.length > 0) {
        setActiveIndex((idx) => (idx - 1 + flatItems.length) % flatItems.length);
      }
      return;
    }
    if (event.key === "Enter" && flatItems[safeActiveIndex]) {
      event.preventDefault();
      selectItem(flatItems[safeActiveIndex]);
    }
  };

  const moduleBadge = (moduleKey: string) => {
    if (tSearch.has(`modules.${moduleKey}`)) {
      return tSearch(`modules.${moduleKey}` as never);
    }
    if (t.has(`${moduleKey}.module.label`)) {
      return t(`${moduleKey}.module.label` as never);
    }
    return moduleKey;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-xs"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tSearch("triggerAria")}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-ink-200 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder={tSearch("placeholder")}
            aria-label={tSearch("placeholder")}
            aria-controls="quick-search-listbox"
            aria-activedescendant={
              flatItems[safeActiveIndex]
                ? `qs-opt-${flatItems[safeActiveIndex].id}`
                : undefined
            }
            className="w-full bg-transparent text-sm text-foreground placeholder:text-ink-400 focus:outline-none"
          />
          {loading ? <Spinner size="sm" /> : null}
          <Button
            isIconOnly
            size="sm"
            variant="tertiary"
            aria-label={tSearch("close")}
            onPress={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div
          id="quick-search-listbox"
          role="listbox"
          className="max-h-[55vh] overflow-y-auto p-2"
        >
          {matchedPages.length > 0 ? (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
                {tSearch("pagesSection")}
              </div>
              {matchedPages.map((item, idx) => {
                const selected = idx === safeActiveIndex;
                return (
                  <button
                    key={item.id}
                    id={`qs-opt-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectItem(item)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-accent/12 text-foreground"
                        : "text-ink-700 hover:bg-surface-muted"
                    }`}
                  >
                    <Compass className="h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.title}
                    </span>
                    {item.subtitle ? (
                      <span className="shrink-0 text-xs text-ink-400">
                        {item.subtitle}
                      </span>
                    ) : null}
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden />
                  </button>
                );
              })}
            </div>
          ) : null}

          {trimmedQuery.length >= 2 ? (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
                {tSearch("recordsSection")}
              </div>
              {loading && records.length === 0 ? (
                <p className="px-2.5 py-3 text-xs text-ink-400">
                  {tSearch("searching")}
                </p>
              ) : records.length === 0 ? (
                <p className="px-2.5 py-3 text-xs text-ink-400">
                  {tSearch("noResults")}
                </p>
              ) : (
                records.map((item, rIdx) => {
                  const globalIdx = matchedPages.length + rIdx;
                  const selected = globalIdx === safeActiveIndex;
                  return (
                    <button
                      key={item.id}
                      id={`qs-opt-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                      onClick={() => selectItem(item)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "bg-accent/12 text-foreground"
                          : "text-ink-700 hover:bg-surface-muted"
                      }`}
                    >
                      <FileSearch className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">
                          {item.title}
                        </div>
                        {item.subtitle ? (
                          <div className="truncate text-xs text-ink-500">
                            {item.subtitle}
                          </div>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-500">
                        {moduleBadge(item.moduleKey)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <p className="px-2.5 py-2 text-xs text-ink-400">
              {tSearch("minCharsHint")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 bg-surface-muted/40 px-4 py-2 text-[11px] text-ink-500">
          <span>{tSearch("navigateHint")}</span>
          <span>{tSearch("closeHint")}</span>
        </div>
      </div>
    </div>
  );
}
