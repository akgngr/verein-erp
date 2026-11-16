import { formatMoney } from "@/shared/money";

type Quarter = {
  incomeCents: number;
  expenseCents: number;
};

type ChartLabels = {
  title: string;
  description: string;
  income: string;
  expense: string;
  period: string;
  quarter: (value: number) => string;
};

/**
 * Server-rendered SVG. No chart runtime, client hooks or chart package.
 * A real HTML table remains available for keyboard and assistive technology.
 */
export function QuarterlyFinanceChart({
  quarters,
  labels,
}: {
  quarters: readonly Quarter[];
  labels: ChartLabels;
}) {
  const ceiling = Math.max(
    1,
    ...quarters.flatMap(({ incomeCents, expenseCents }) => [
      incomeCents,
      expenseCents,
    ]),
  );
  // Rounded ceiling prevents the highest value from touching the top grid line.
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(ceiling)) - 1);
  const maximum = Math.ceil((ceiling * 1.12) / magnitude) * magnitude;

  const chartWidth = 880;
  const left = 74;
  const right = 24;
  const plotTop = 34;
  const plotBottom = 250;
  const plotHeight = plotBottom - plotTop;
  const availableWidth = chartWidth - left - right;
  const cellWidth = availableWidth / 4;
  const barWidth = 39;
  const gap = 12;
  const y = (amount: number) => plotBottom - (Math.max(0, amount) / maximum) * plotHeight;

  const compact = new Intl.NumberFormat("de-DE", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 px-5 py-5 sm:px-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {labels.title}
          </h2>
          <p className="max-w-xl text-xs leading-relaxed text-ink-500 sm:text-sm">
            {labels.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-600">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-success-500" aria-hidden="true" />
            {labels.income}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
            {labels.expense}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto px-3 pb-3 pt-4 sm:px-6 sm:pt-6">
        <svg
          viewBox={`0 0 ${chartWidth} 290`}
          className="h-auto w-full min-w-[640px]"
          role="img"
          aria-label={labels.description}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="acc9IncomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="text-success-500" stopColor="currentColor" stopOpacity=".96" />
              <stop offset="100%" className="[stop-color:var(--color-success-500)]" stopOpacity=".66" />
            </linearGradient>
            <linearGradient id="acc9ExpenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="text-accent" stopColor="currentColor" stopOpacity=".94" />
              <stop offset="100%" className="[stop-color:var(--color-accent)]" stopOpacity=".60" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3, 4].map((index) => {
            const fraction = index / 4;
            const tick = maximum * (1 - fraction);
            const lineY = plotTop + fraction * plotHeight;
            return (
              <g key={index}>
                <line
                  x1={left}
                  x2={chartWidth - right}
                  y1={lineY}
                  y2={lineY}
                  className="stroke-ink-200"
                  strokeWidth="1"
                  strokeDasharray={index === 4 ? undefined : "3 6"}
                />
                <text
                  x={left - 14}
                  y={lineY + 4}
                  textAnchor="end"
                  className="fill-ink-500 text-[12px] tabular-nums"
                >
                  {compact.format(tick / 100)}
                </text>
              </g>
            );
          })}

          {quarters.map((quarter, index) => {
            const centerX = left + cellWidth * (index + 0.5);
            const incomeX = centerX - gap / 2 - barWidth;
            const expenseX = centerX + gap / 2;
            const entries = [
              {
                key: "income",
                x: incomeX,
                amount: quarter.incomeCents,
                label: labels.income,
                fill: "url(#acc9IncomeGradient)",
              },
              {
                key: "expense",
                x: expenseX,
                amount: quarter.expenseCents,
                label: labels.expense,
                fill: "url(#acc9ExpenseGradient)",
              },
            ];
            return (
              <g key={index}>
                {entries.map((entry) => {
                  const top = y(entry.amount);
                  const height = Math.max(0, plotBottom - top);
                  return (
                    <g key={entry.key}>
                      <rect
                        x={entry.x}
                        y={top}
                        width={barWidth}
                        height={height}
                        rx={Math.min(9, height / 2)}
                        fill={entry.fill}
                      >
                        <title>{`${labels.quarter(index + 1)} · ${entry.label}: ${formatMoney(entry.amount)}`}</title>
                      </rect>
                      {entry.amount > 0 ? (
                        <text
                          x={entry.x + barWidth / 2}
                          y={Math.max(19, top - 10)}
                          textAnchor="middle"
                          className="fill-ink-600 text-[11px] font-semibold tabular-nums"
                        >
                          {compact.format(entry.amount / 100)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
                <text
                  x={centerX}
                  y={plotBottom + 25}
                  textAnchor="middle"
                  className="fill-ink-600 text-[13px] font-medium"
                >
                  {labels.quarter(index + 1)}
                </text>
              </g>
            );
          })}
        </svg>
        <table className="mt-1 w-full text-xs sm:text-sm">
          <caption className="sr-only">{labels.title}</caption>
          <thead>
            <tr className="border-b border-ink-100 text-ink-500">
              <th scope="col" className="py-3 text-left font-medium">{labels.period}</th>
              <th scope="col" className="py-3 text-right font-medium">{labels.income}</th>
              <th scope="col" className="py-3 text-right font-medium">{labels.expense}</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((quarter, index) => (
              <tr key={index} className="border-b border-ink-100 last:border-b-0">
                <th scope="row" className="py-2.5 text-left font-medium text-ink-600">
                  {labels.quarter(index + 1)}
                </th>
                <td className="py-2.5 text-right font-semibold tabular-nums text-foreground">
                  {formatMoney(quarter.incomeCents)}
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-foreground">
                  {formatMoney(quarter.expenseCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
