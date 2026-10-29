import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

import type { ReadinessItem } from "../types";

/** Muafiyet bitişine bu kadar gün kala uyarı verilir (§ 15 md. 8). */
const VALIDITY_WARNING_DAYS = 90;

/**
 * Hazır olma kontrol listesi (§ 15 md. 6 ve 8): her kalem ✓/✗ ve eksikse
 * düzeltme bağlantısı. Etiketler sunucuda isteğin dilinde üretilir (getReadiness).
 * HeroUI kullanmaz; sunucu bileşeni olarak render edilebilir.
 */
export function ReadinessChecklist({
  items,
  title,
  fixLabel,
  warnLabel,
}: {
  items: ReadinessItem[];
  title: string;
  fixLabel: string;
  warnLabel: string;
}) {
  return (
    <section className="rounded-medium border border-default-200 bg-content1 p-4 shadow-sm">
      <h2 className="mb-3 text-small font-semibold text-foreground">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const warn =
            item.ok && item.daysRemaining !== null && item.daysRemaining < VALIDITY_WARNING_DAYS;
          const Icon = !item.ok ? XCircle : warn ? AlertTriangle : CheckCircle2;
          return (
            <li key={item.key} className="flex items-start gap-2 text-small">
              <Icon
                className={
                  !item.ok
                    ? "mt-0.5 h-4 w-4 shrink-0 text-danger"
                    : warn
                      ? "mt-0.5 h-4 w-4 shrink-0 text-warning"
                      : "mt-0.5 h-4 w-4 shrink-0 text-success"
                }
                aria-hidden
              />
              <span className="flex-1 text-default-700">
                {item.label}
                {warn ? <span className="ml-1 text-warning-600">— {warnLabel}</span> : null}
              </span>
              {item.fixHref ? (
                <Link href={item.fixHref} className="shrink-0 text-primary underline">
                  {fixLabel}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
