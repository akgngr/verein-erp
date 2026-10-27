"use client";

import { useTranslations } from "next-intl";

import { PdfSplitButton } from "@/shared/components/ui/pdf-split-button";

/**
 * Kasa defteri PDF split button (§ 11.8 md. 2): hesap/tarih aralığını URL'e
 * taşır; ?lang= ile de/tr yeni sekmede açılır.
 */
export function ReportLedgerSelector({
  accountId,
  from,
  to,
}: {
  accountId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("accounting.reports.ledger");
  return (
    <PdfSplitButton
      size="md"
      buildHref={(lang) =>
        `/api/accounting/reports/ledger/pdf?account=${accountId}&from=${from}&to=${to}&lang=${lang}`
      }
      label={t("pdf")}
      aria={t("pdf")}
    />
  );
}
