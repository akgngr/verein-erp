import Link from "next/link";

import type { DashboardCardContext } from "@/shared/types/dashboard";
import type { Briefing } from "@/shared/secretary/define";

const TONE: Record<string, string> = { danger: "bg-danger-500", warning: "bg-warning-500", info: "bg-accent" };

/** Panel "Bugün" kartı gövdesi: en çok 5 öğe, yalnız başlık ve modülün kendi sayfasına bağlantı. */
export function TodayCardBody({ briefing, t }: { briefing: Briefing; t: DashboardCardContext["t"] }) {
  const items = briefing.sections.flatMap((section) => section.items);
  if (items.length === 0) return <p className="text-sm text-ink-500">{t("cards.today.empty")}</p>;
  return (
    <div className="space-y-3">
      <ul className="space-y-1" aria-label={t("cards.today.listLabel")}>
        {items.slice(0, 5).map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink-100/60 focus-visible:outline-2 focus-visible:outline-accent motion-safe:transition-colors dark:hover:bg-white/5"
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE[item.severity] ?? TONE.info}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 break-words">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      {briefing.failures.length > 0 ? <p role="status" className="text-xs text-ink-500">{t("cards.today.partial")}</p> : null}
      <Link href="/sekreter" className="inline-flex text-sm font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
        {t("cards.today.more", { count: items.length })}
      </Link>
    </div>
  );
}
