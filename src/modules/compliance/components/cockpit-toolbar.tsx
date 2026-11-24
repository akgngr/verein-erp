"use client";

import { Download, Eye, FileSpreadsheet, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { exportComplianceReportAction } from "../actions/export";

type Props = {
  year: number;
  years: number[];
  preview: boolean;
  canPreview: boolean;
};

export function ComplianceCockpitToolbar({ year, years, preview, canPreview }: Props) {
  const t = useTranslations("compliance.ui");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [downloadUrl, setDownloadUrl] = useState<{ url: string; format: string } | null>(null);

  function navigate(nextYear: number, nextPreview: boolean) {
    const qs = new URLSearchParams();
    qs.set("year", String(nextYear));
    if (nextPreview) qs.set("preview", "1");
    router.push(`/compliance?${qs.toString()}`);
  }

  function handleExport(format: "pdf" | "csv") {
    startTransition(async () => {
      const res = await exportComplianceReportAction({ year, preview, format });
      if (!res.ok) {
        notify(translate(res.error), "danger");
        return;
      }
      setDownloadUrl({ url: res.data.url, format: res.data.format.toUpperCase() });
      notify(t("exportReady", { format: res.data.format.toUpperCase() }), "success");
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <span>{t("yearLabel")}</span>
          <select
            aria-label={t("yearLabel")}
            value={year}
            onChange={(e) => navigate(Number(e.target.value), preview)}
            className="rounded-lg border border-ink-200 bg-surface-0 px-3 py-1.5 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {canPreview ? (
          <Button
            type="button"
            size="sm"
            variant={preview ? "primary" : "secondary"}
            onPress={() => navigate(year, !preview)}
            aria-pressed={preview}
          >
            <Eye size={14} />
            {preview ? t("previewActive") : t("previewToggle")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" isDisabled={isPending} onPress={() => handleExport("pdf")}>
          <FileText size={14} />
          {t("exportPdf")}
        </Button>
        <Button type="button" size="sm" variant="secondary" isDisabled={isPending} onPress={() => handleExport("csv")}>
          <FileSpreadsheet size={14} />
          {t("exportCsv")}
        </Button>
        {downloadUrl ? (
          <a
            href={downloadUrl.url}
            className="inline-flex items-center gap-1.5 rounded-lg border border-success-300 bg-success-50 px-3 py-1.5 text-xs font-medium text-success-800 hover:bg-success-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Download size={14} />
            {t("downloadExport", { format: downloadUrl.format })}
          </a>
        ) : null}
      </div>
    </div>
  );
}
