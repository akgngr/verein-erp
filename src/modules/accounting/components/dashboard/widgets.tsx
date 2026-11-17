import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, Minus } from "lucide-react";

import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { formatMoney } from "@/shared/money";


/** Mini trend line (12 points). Decorative; the value is always given as text next to it. */
function Sparkline({ values, className }: { values: readonly number[]; className: string }) {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${28 - ((value - min) / (max - min || 1)) * 26}`);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full overflow-visible" aria-hidden="true">
      <path d={`M${points.join(" L")}`} fill="none" strokeWidth={1.6} pathLength={1000}
        strokeLinecap="round" strokeLinejoin="round" className={`erp-motion-draw ${className}`} />
    </svg>
  );
}

/** KPI tile: value, change vs. same period last year, 12-month sparkline. */
export function KpiTile(props: {
  label: string; cents: number; change: number | null; changeLabel: string; noChange: string;
  /** true when an increase is good (income, result), false when it is bad (expense). */
  upIsGood: boolean; icon: LucideIcon; tone: "success" | "accent" | "neutral"; trend: readonly number[];
}) {
  const Icon = props.icon;
  const iconTone = props.tone === "success" ? "bg-success-50 text-success-600 dark:bg-success-950/35"
    : props.tone === "accent" ? "bg-accent/10 text-accent" : "bg-ink-100 text-ink-700";
  const lineTone = props.tone === "success" ? "stroke-success-500" : props.tone === "accent" ? "stroke-accent" : "stroke-ink-600";
  const good = props.change === null || props.change === 0 ? null : (props.change > 0) === props.upIsGood;
  const ChangeIcon = props.change === null || props.change === 0 ? Minus : props.change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <SurfaceCard interactive className="min-w-0 p-0" contentClassName="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-ink-500">{props.label}</h2>
        <span className={`inline-flex size-9 items-center justify-center rounded-xl ${iconTone}`}><Icon size={18} aria-hidden="true" /></span>
      </div>
      <p className={`mt-3 break-words text-[clamp(1.35rem,2.4vw,1.85rem)] font-semibold tracking-tight tabular-nums ${props.cents < 0 ? "text-danger-600" : "text-foreground"}`}>
        {formatMoney(props.cents)}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={`inline-flex items-center gap-0.5 shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 font-semibold tabular-nums ${good === null ? "bg-ink-100 text-ink-600" : good ? "bg-success-50 text-success-700 dark:bg-success-950/35" : "bg-danger-50 text-danger-700 dark:bg-danger-950/35"}`}>
          {props.change === null ? null : <ChangeIcon size={12} aria-hidden="true" />}
          {props.change === null ? props.noChange : `${props.change > 0 ? "+" : ""}${props.change.toLocaleString("de-DE")}%`}
        </span>
        <span className="whitespace-nowrap text-ink-500">{props.changeLabel}</span>
      </div>
      <div className="mt-3"><Sparkline values={props.trend} className={lineTone} /></div>
    </SurfaceCard>
  );
}

/** Liquidity hero: total balance now, per-account bars, 30-day expected balance. */
export function LiquidityHero(props: {
  labels: { title: string; forecast: string; forecastHint: string; incoming: string; outgoing: string; noAccounts: string; asOf: string };
  liquidityCents: number; forecastCents: number; incomingCents: number; outgoingCents: number;
  accounts: readonly { id: string; name: string; balanceCents: number }[];
}) {
  const max = Math.max(1, ...props.accounts.map((account) => Math.abs(account.balanceCents)));
  const delta = props.forecastCents - props.liquidityCents;
  return (
    <SurfaceCard className="relative overflow-hidden p-0" contentClassName="p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
      <div className="relative grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-sm font-medium text-ink-500">{props.labels.title}</p>
          <p className={`mt-1 text-[clamp(1.9rem,4vw,2.75rem)] font-semibold tracking-tight tabular-nums ${props.liquidityCents < 0 ? "text-danger-600" : "text-foreground"}`}>
            {formatMoney(props.liquidityCents)}
          </p>
          <p className="text-xs text-ink-500">{props.labels.asOf}</p>
          <div className="mt-5 rounded-xl bg-[var(--ui-surface-muted)] p-4">
            <p className="text-xs font-medium text-ink-500">{props.labels.forecast}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <span className={`text-xl font-semibold tabular-nums ${props.forecastCents < 0 ? "text-danger-600" : "text-foreground"}`}>{formatMoney(props.forecastCents)}</span>
              <span className={`text-xs font-semibold tabular-nums ${delta < 0 ? "text-danger-600" : "text-success-600"}`}>{delta >= 0 ? "+" : ""}{formatMoney(delta)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
              <span className="inline-flex items-center gap-1"><ArrowUpRight size={13} className="text-success-600" aria-hidden="true" />{props.labels.incoming} {formatMoney(props.incomingCents)}</span>
              <span className="inline-flex items-center gap-1"><ArrowDownRight size={13} className="text-danger-600" aria-hidden="true" />{props.labels.outgoing} {formatMoney(props.outgoingCents)}</span>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">{props.labels.forecastHint}</p>
          </div>
        </div>
        <ul className="space-y-3 self-center">
          {props.accounts.length === 0 ? <li className="text-sm text-ink-500">{props.labels.noAccounts}</li> : null}
          {props.accounts.map((account, index) => (
            <li key={account.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink-700">{account.name}</span>
                <span className={`tabular-nums font-medium ${account.balanceCents < 0 ? "text-danger-600" : ""}`}>{formatMoney(account.balanceCents)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                <div className={`erp-motion-enter h-full origin-left rounded-full ${account.balanceCents < 0 ? "bg-danger-500" : "bg-accent"}`}
                  style={{ width: `${Math.max(2, (Math.abs(account.balanceCents) / max) * 100)}%`, animationDelay: `${index * 40}ms` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SurfaceCard>
  );
}

export type TimelineItem = { kind: "receivable" | "payable" | "tax"; key: string; title: string; subtitle: string; date: Date; cents: number | null; href: string };

/** Upcoming items in the next weeks: receivables, payables and tax deadlines, chronological. */
export function UpcomingTimeline({ items, labels, locale }: {
  items: readonly TimelineItem[];
  labels: { title: string; description: string; empty: string; receivable: string; payable: string; tax: string };
  locale: string;
}) {
  const tone = { receivable: "bg-success-500", payable: "bg-danger-500", tax: "bg-warning-500" } as const;
  return (
    <section aria-labelledby="accounting-upcoming">
    <SurfaceCard className="p-0" contentClassName="p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <CalendarClock size={18} className="text-ink-500" aria-hidden="true" />
        <h2 id="accounting-upcoming" className="text-base font-semibold tracking-tight">{labels.title}</h2>
      </div>
      <p className="text-xs text-ink-500 sm:text-sm">{labels.description}</p>
      {items.length === 0 ? <p className="mt-5 text-sm text-ink-500">{labels.empty}</p> : (
        <ol className="relative mt-5 space-y-4 border-l border-ink-200 pl-5">
          {items.map((item, index) => (
            <li key={item.key} className="erp-motion-enter relative" style={{ animationDelay: `${index * 30}ms` }}>
              <span className={`absolute -left-[26.5px] top-1.5 size-3 rounded-full ring-4 ring-[var(--ui-surface-card)] ${tone[item.kind]}`} aria-hidden="true" />
              <Link href={item.href} className="erp-motion-interactive -mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-1 hover:bg-[var(--ui-surface-muted)]">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-500">
                    {item.date.toLocaleDateString(locale, { day: "2-digit", month: "short", timeZone: "UTC" })} · {labels[item.kind]}
                  </p>
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="truncate text-xs text-ink-500">{item.subtitle}</p>
                </div>
                {item.cents !== null ? (
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${item.kind === "receivable" ? "text-success-600" : item.kind === "payable" ? "text-danger-600" : ""}`}>
                    {item.kind === "payable" ? "−" : "+"}{formatMoney(item.cents)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </SurfaceCard>
    </section>
  );
}

export type AttentionItem = { key: string; severity: "warning" | "danger" | "info"; text: string; action: string; href: string };

/** Things that need a human now. Read-only; each item links to the screen where the user acts. */
export function AttentionList({ items, labels }: { items: readonly AttentionItem[]; labels: { title: string; empty: string } }) {
  const tone = { danger: "border-l-danger-500", warning: "border-l-warning-500", info: "border-l-accent" } as const;
  return (
    <section aria-labelledby="accounting-attention">
    <SurfaceCard className="p-0" contentClassName="p-5 sm:p-6">
      <h2 id="accounting-attention" className="text-base font-semibold tracking-tight">{labels.title}</h2>
      {items.length === 0 ? <p className="mt-3 text-sm text-ink-500">{labels.empty}</p> : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link href={item.href} className={`erp-motion-interactive group flex flex-col gap-1.5 rounded-xl border border-ink-100 border-l-4 ${tone[item.severity]} bg-[var(--ui-surface-card)] px-4 py-3 text-sm hover:bg-[var(--ui-surface-muted)]`}>
                <span className="min-w-0 leading-snug">{item.text}</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                  {item.action}<ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
    </section>
  );
}
