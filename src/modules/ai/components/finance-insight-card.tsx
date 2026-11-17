"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Eye, RefreshCw, Sparkles } from "lucide-react";

type Insight = {
  status: "good" | "watch" | "risk";
  headline: string;
  points: string[];
  actions: string[];
  processing: "local" | "cloud";
  generatedAt: string;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; insight: Insight }
  | { kind: "error"; message: string };

const STATUS = {
  good: { icon: CheckCircle2, tone: "text-success-600", ring: "bg-success-50 dark:bg-success-950/35" },
  watch: { icon: Eye, tone: "text-warning-600", ring: "bg-warning-50 dark:bg-warning-950/35" },
  risk: { icon: AlertTriangle, tone: "text-danger-600", ring: "bg-danger-50 dark:bg-danger-950/35" },
} as const;

const storageKey = (year: number, locale: string) => `ai.finance-insight.${year}.${locale}`;

/**
 * Muhasebe durum analizi. Sonuç oturum boyunca sessionStorage'da tutulur (aynı sekmede her ziyarette yeni
 * model çağrısı yapılmaz); "Yenile" ile yeniden üretilir. Yalnız toplam veriler kullanılır.
 */
export function FinanceInsightCard({ year }: { year: number }) {
  const t = useTranslations("ai.insight");
  const locale = useLocale();
  const [state, setState] = useState<State>({ kind: "idle" });

  const load = useCallback(async (force: boolean) => {
    const key = storageKey(year, locale);
    if (!force) {
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          setState({ kind: "ready", insight: JSON.parse(cached) as Insight });
          return;
        }
      } catch {
        // sessionStorage kapalı olabilir; doğrudan üret.
      }
    }
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: locale === "de" ? "de" : "tr", year }),
      });
      const body = (await response.json()) as { ok: boolean; insight?: Insight; error?: string };
      if (!body.ok || !body.insight) {
        setState({ kind: "error", message: body.error ?? t("failed") });
        return;
      }
      try {
        sessionStorage.setItem(key, JSON.stringify(body.insight));
      } catch {
        // yoksay
      }
      setState({ kind: "ready", insight: body.insight });
    } catch {
      setState({ kind: "error", message: t("failed") });
    }
  }, [locale, t, year]);

  useEffect(() => {
    // İlk görünümde bir kez (önbellek varsa ondan).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
  }, [load]);

  return (
    <div className="space-y-4" aria-live="polite" aria-busy={state.kind === "loading"}>
      {state.kind === "loading" || state.kind === "idle" ? (
        <div className="space-y-3" role="status">
          <span className="sr-only">{t("loading")}</span>
          <div className="h-5 w-3/4 animate-pulse rounded bg-ink-100" />
          <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-ink-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
        </div>
      ) : null}

      {state.kind === "error" ? (
        <p className="rounded-lg border border-ink-200 bg-[var(--ui-surface-muted)] p-3 text-sm text-ink-600">{state.message}</p>
      ) : null}

      {state.kind === "ready" ? (() => {
        const appearance = STATUS[state.insight.status];
        const Icon = appearance.icon;
        return (
          <div className="erp-motion-enter space-y-4">
            <div className="flex items-start gap-3">
              <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${appearance.ring} ${appearance.tone}`}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold uppercase tracking-wide ${appearance.tone}`}>{t(`status.${state.insight.status}`)}</p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{state.insight.headline}</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-ink-700">
              {state.insight.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            {state.insight.actions.length > 0 ? (
              <div className="rounded-xl bg-[var(--ui-surface-muted)] p-3">
                <p className="mb-1.5 text-xs font-semibold text-ink-500">{t("actions")}</p>
                <ol className="list-decimal space-y-1 pl-4 text-sm text-ink-700">
                  {state.insight.actions.map((action) => <li key={action}>{action}</li>)}
                </ol>
              </div>
            ) : null}
          </div>
        );
      })() : null}

      <div className="flex items-center justify-between gap-2 border-t border-ink-100 pt-3 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={13} aria-hidden="true" />
          {state.kind === "ready"
            ? t("generated", {
              time: new Date(state.insight.generatedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
              where: t(`processing.${state.insight.processing}`),
            })
            : t("disclaimer")}
        </span>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={state.kind === "loading"}
          className="erp-motion-interactive inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
        >
          <RefreshCw size={13} aria-hidden="true" className={state.kind === "loading" ? "animate-spin" : undefined} />
          {t("refresh")}
        </button>
      </div>
    </div>
  );
}
