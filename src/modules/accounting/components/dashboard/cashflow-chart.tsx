import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { formatMoney } from "@/shared/money";

type Month = { incomeCents: number; expenseCents: number };

export type CashflowLabels = {
  title: string;
  description: string;
  income: string;
  expense: string;
  net: string;
  tableToggle: string;
  monthColumn: string;
  months: string[];
};

/**
 * Monthly income/expense bars with a cumulative net line. Server-rendered SVG with one-shot CSS entry
 * motion (erp-motion-grow-y / erp-motion-draw); the same numbers are available as an accessible table.
 */
export function CashflowChart({ months, labels, highlight }: { months: readonly Month[]; labels: CashflowLabels; highlight?: number }) {
  const cumulative = months.reduce<number[]>((acc, month) => [...acc, (acc.at(-1) ?? 0) + month.incomeCents - month.expenseCents], []);
  const ceiling = Math.max(1, ...months.flatMap((month) => [month.incomeCents, month.expenseCents]), ...cumulative.map(Math.abs));
  const floor = Math.min(0, ...cumulative);
  const span = ceiling - floor;

  const width = 880;
  const left = 64;
  const right = 16;
  const top = 20;
  const bottom = 236;
  const cell = (width - left - right) / 12;
  const bar = Math.min(18, cell / 3.2);
  const y = (cents: number) => top + ((ceiling - cents) / span) * (bottom - top);
  const zero = y(0);
  const compact = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => floor + span * ratio);

  const points = cumulative.map((cents, index) => `${left + cell * index + cell / 2},${y(cents)}`);
  const area = `M${left + cell / 2},${zero} L${points.join(" L")} L${left + cell * 11 + cell / 2},${zero} Z`;
  const line = `M${points.join(" L")}`;

  return (
    <section aria-label={labels.title}>
    <SurfaceCard className="overflow-hidden p-0" contentClassName="p-0">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{labels.title}</h2>
          <p className="text-xs text-ink-500 sm:text-sm">{labels.description}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-ink-600">
          <li className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success-500" aria-hidden="true" />{labels.income}</li>
          <li className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent" aria-hidden="true" />{labels.expense}</li>
          <li className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-ink-700" aria-hidden="true" />{labels.net}</li>
        </ul>
      </header>

      <div className="overflow-x-auto px-2 pb-2 pt-3 sm:px-4">
        <svg viewBox={`0 0 ${width} 268`} className="h-auto min-w-[640px] w-full" role="img" aria-label={labels.title}>
          <defs>
            <linearGradient id="acc-net-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((value) => (
            <g key={value}>
              <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="stroke-ink-100" strokeDasharray={value === 0 ? undefined : "3 5"} />
              <text x={left - 10} y={y(value) + 4} textAnchor="end" className="fill-ink-400 text-[11px] tabular-nums">{compact.format(value / 100)}</text>
            </g>
          ))}
          {highlight !== undefined ? (
            <rect x={left + cell * highlight + 2} y={top - 8} width={cell - 4} height={bottom - top + 16} rx={10} className="fill-accent/5" />
          ) : null}
          {months.map((month, index) => {
            const center = left + cell * index + cell / 2;
            const incomeTop = y(month.incomeCents);
            const expenseTop = y(month.expenseCents);
            return (
              <g key={index} className="group">
                <title>{`${labels.months[index]} · ${labels.income}: ${formatMoney(month.incomeCents)} · ${labels.expense}: ${formatMoney(month.expenseCents)} · ${labels.net}: ${formatMoney(cumulative[index])}`}</title>
                <rect x={left + cell * index} y={top} width={cell} height={bottom - top} fill="transparent" />
                <rect x={center - bar - 2} y={incomeTop} width={bar} height={Math.max(0, zero - incomeTop)} rx={4}
                  className="erp-motion-grow-y fill-success-500 transition-opacity group-hover:opacity-80" style={{ animationDelay: `${index * 25}ms` }} />
                <rect x={center + 2} y={expenseTop} width={bar} height={Math.max(0, zero - expenseTop)} rx={4}
                  className="erp-motion-grow-y fill-accent transition-opacity group-hover:opacity-80" style={{ animationDelay: `${index * 25 + 12}ms` }} />
                <text x={center} y={258} textAnchor="middle" className={`text-[11px] ${index === highlight ? "fill-foreground font-semibold" : "fill-ink-500"}`}>{labels.months[index]}</text>
              </g>
            );
          })}
          <path d={area} fill="url(#acc-net-area)" className="text-ink-700" />
          <path d={line} fill="none" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" pathLength={1000}
            className="erp-motion-draw stroke-ink-700" style={{ animationDelay: "120ms" }} />
          {cumulative.map((cents, index) => (
            <circle key={index} cx={left + cell * index + cell / 2} cy={y(cents)} r={3} className="fill-[var(--ui-surface-card)] stroke-ink-700" strokeWidth={2} />
          ))}
        </svg>
      </div>

      <details className="border-t border-ink-100 px-5 py-3 text-sm sm:px-6">
        <summary className="cursor-pointer text-xs font-medium text-ink-500">{labels.tableToggle}</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs tabular-nums">
            <thead className="text-ink-500">
              <tr><th className="py-1.5 font-medium">{labels.monthColumn}</th><th className="py-1.5 text-right font-medium">{labels.income}</th><th className="py-1.5 text-right font-medium">{labels.expense}</th><th className="py-1.5 text-right font-medium">{labels.net}</th></tr>
            </thead>
            <tbody>
              {months.map((month, index) => (
                <tr key={index} className="border-t border-ink-100">
                  <th scope="row" className="py-1.5 font-medium">{labels.months[index]}</th>
                  <td className="py-1.5 text-right">{formatMoney(month.incomeCents)}</td>
                  <td className="py-1.5 text-right">{formatMoney(month.expenseCents)}</td>
                  <td className="py-1.5 text-right">{formatMoney(cumulative[index])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </SurfaceCard>
    </section>
  );
}
