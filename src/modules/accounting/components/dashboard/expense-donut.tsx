import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { formatMoney } from "@/shared/money";

const SLICE_CLASSES = ["stroke-accent", "stroke-success-500", "stroke-warning-500", "stroke-danger-500", "stroke-ink-500", "stroke-ink-300"];
const DOT_CLASSES = ["bg-accent", "bg-success-500", "bg-warning-500", "bg-danger-500", "bg-ink-500", "bg-ink-300"];

/** Expense breakdown ring (top categories + other). Server SVG; legend carries the same values as text. */
export function ExpenseDonut({ slices, otherCents, labels }: {
  slices: readonly { id: string; name: string | null; cents: number }[];
  otherCents: number;
  labels: { title: string; description: string; other: string; uncategorized: string; empty: string; total: string };
}) {
  const rows = [
    ...slices.map((slice) => ({ id: slice.id, name: slice.name ?? labels.uncategorized, cents: slice.cents })),
    ...(otherCents > 0 ? [{ id: "other", name: labels.other, cents: otherCents }] : []),
  ];
  const total = rows.reduce((sum, row) => sum + row.cents, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offsets = rows.reduce<number[]>((acc, row) => [...acc, (acc.at(-1) ?? 0) + (row.cents / Math.max(1, total)) * circumference], [0]);

  return (
    <section aria-label={labels.title}>
    <SurfaceCard className="p-0" contentClassName="p-5 sm:p-6">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{labels.title}</h2>
      <p className="text-xs text-ink-500 sm:text-sm">{labels.description}</p>
      {total === 0 ? (
        <p className="mt-6 text-sm text-ink-500">{labels.empty}</p>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-5 2xl:flex-row">
          <div className="relative size-40 shrink-0">
            <svg viewBox="0 0 140 140" className="size-40 -rotate-90" aria-hidden="true">
              <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="16" className="stroke-ink-100" />
              {rows.map((row, index) => {
                const length = (row.cents / total) * circumference;
                const dash = Math.max(0, length - 2);
                const offset = offsets[index];
                return (
                  <circle key={row.id} cx="70" cy="70" r={radius} fill="none" strokeWidth="16" strokeLinecap="butt"
                    className={`erp-motion-enter ${SLICE_CLASSES[index % SLICE_CLASSES.length]}`}
                    strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
                    style={{ animationDelay: `${index * 25}ms` }} />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] text-ink-500">{labels.total}</span>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(total)}</span>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
            {rows.map((row, index) => (
              <li key={row.id} className="flex items-center gap-2">
                <span className={`size-2.5 shrink-0 rounded-sm ${DOT_CLASSES[index % DOT_CLASSES.length]}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="tabular-nums text-ink-500">{Math.round((row.cents / total) * 100)}%</span>
                <span className="w-24 text-right tabular-nums font-medium">{formatMoney(row.cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SurfaceCard>
    </section>
  );
}
