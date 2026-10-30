import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "../../utils";

/**
 * Panel kartı gövdeleri (sunucu bileşeni; hook ve HeroUI yok). Modüller kart `render` fonksiyonunda
 * bunları döndürür; böylece tüm kartlar aynı görünür.
 */

type Tone = "default" | "success" | "warning" | "danger";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-foreground",
  success: "text-success-600",
  warning: "text-warning-600",
  danger: "text-danger-600",
};

export type StatDetail = { label: string; value: ReactNode; tone?: Tone };

/** Sayısal kart: büyük değer + etiket, altta küçük ayrıntılar. */
export function StatCardBody({
  value,
  label,
  tone = "default",
  details = [],
}: {
  value: ReactNode;
  label: string;
  tone?: Tone;
  details?: StatDetail[];
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-baseline gap-2">
        <span className={cn("truncate text-3xl font-bold tracking-tight", TONE_TEXT[tone])}>{value}</span>
        <span className="truncate text-small font-medium text-default-500">{label}</span>
      </div>
      {details.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-default-100 pt-3 text-tiny">
          {details.map((detail) => (
            <span key={detail.label} className="flex items-center gap-1 text-default-500">
              <span>{detail.label}:</span>
              <span className={cn("font-semibold", TONE_TEXT[detail.tone ?? "default"])}>{detail.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type TableColumn = { key: string; label: string; align?: "left" | "right" };
export type TableRow = { id: string; href?: string; cells: Record<string, ReactNode> };

/** Tablo kartı: kısa liste (en fazla birkaç satır); satır bağlantılı olabilir. */
export function TableCardBody({
  columns,
  rows,
  emptyText,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  emptyText: string;
}) {
  if (rows.length === 0) return <p className="py-4 text-small text-default-500">{emptyText}</p>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-small">
        <thead>
          <tr className="border-b border-default-100 text-left text-tiny text-default-500">
            {columns.map((column) => (
              <th key={column.key} className={cn("px-1 pb-2 font-medium", column.align === "right" && "text-right")}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-default-100 last:border-none">
              {columns.map((column, index) => (
                <td key={column.key} className={cn("px-1 py-2", column.align === "right" && "text-right")}>
                  {index === 0 && row.href ? (
                    <Link href={row.href} className="font-medium text-primary hover:underline">
                      {row.cells[column.key]}
                    </Link>
                  ) : (
                    row.cells[column.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Gösterge kartı: 0-100 arası oran için dairesel gösterge. */
export function GaugeCardBody({
  percent,
  label,
  caption,
  details = [],
}: {
  /** 0-100; null ise "—" gösterilir. */
  percent: number | null;
  label: string;
  caption?: string;
  details?: StatDetail[];
}) {
  const value = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const tone: Tone = percent === null ? "default" : value >= 80 ? "success" : value >= 50 ? "warning" : "danger";
  const stroke = { default: "stroke-default-300", success: "stroke-success", warning: "stroke-warning", danger: "stroke-danger" }[tone];
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90" role="img" aria-label={`${label}: ${percent === null ? "—" : `${Math.round(value)}%`}`}>
        <circle cx="50" cy="50" r={radius} className="fill-none stroke-default-100" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className={cn("fill-none transition-[stroke-dashoffset]", stroke)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
        <text
          x="50"
          y="50"
          className="rotate-90 fill-foreground text-[20px] font-bold"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ transformOrigin: "50px 50px" }}
        >
          {percent === null ? "—" : `${Math.round(value)}%`}
        </text>
      </svg>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-small font-semibold text-foreground">{label}</span>
        {caption ? <span className="text-tiny text-default-500">{caption}</span> : null}
        {details.map((detail) => (
          <span key={detail.label} className="text-tiny text-default-500">
            {detail.label}:{" "}
            <span className={cn("font-semibold", TONE_TEXT[detail.tone ?? "default"])}>{detail.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Uyarı kartı: kısa mesaj + eylem bağlantısı. */
export function AlertCardBody({ message, actionHref, actionLabel }: { message: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-danger-50/70 p-3 text-small text-danger-700 dark:bg-danger-500/10 dark:text-danger-300">
      <span className="font-medium">{message}</span>
      <Link href={actionHref} className="font-semibold underline underline-offset-4">
        {actionLabel}
      </Link>
    </div>
  );
}
