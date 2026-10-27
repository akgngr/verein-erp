"use client";

import { useTranslations } from "next-intl";

import { PdfSplitButton } from "@/shared/components/ui/pdf-split-button";

/** Kassenbericht PDF split button (§ 11.8 md. 4): de varsayılan, dropdown tr. */
export function AnnualPdfButton({ year, label }: { year: number; label: string }) {
  const t = useTranslations("accounting.reports.ledger");
  void t;
  return (
    <PdfSplitButton
      size="md"
      buildHref={(lang) => `/api/accounting/reports/annual/pdf?year=${year}&lang=${lang}`}
      label={label}
      aria={label}
    />
  );
}
