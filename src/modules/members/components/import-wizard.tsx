"use client";

import { notify } from "@/shared/components/ui/notify";import { Button, buttonVariants, Link as ActionLink } from "@heroui/react";
import { Card, ProgressBar, Spinner } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Download, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { ImportCommitData, ImportPreviewData } from "../types";

/**
 * İki adımlı üye içe aktarma sihirbazı (Faz 3 eklemeleri):
 * 1) Şablon indir + dosya seç + "Kontrol et" (dry-run, yazma yok),
 * 2) hatalar tabloda raporlanır, geçerli satır varsa "İçe aktar" açılır;
 * commit hatalı satırları atlayarak geçerli satırları tek transaction'da yazar.
 */
export function ImportWizard() {
  const t = useTranslations("members.import");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [commit, setCommit] = useState<ImportCommitData | null>(null);

  const pickFile = (nextFile: File | null) => {
    setFile(nextFile);
    setPreview(null);
    setCommit(null);
    setError(null);
  };

  const post = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        `/api/members/import?dryRun=${dryRun ? "1" : "0"}`,
        {
          method: "POST",
          body: formData,
        },
      );
      const json = (await response.json()) as
        | {
            ok: true;
            total: number;
            valid: number;
            errors: { row: number; messages: string[] }[];
            imported?: number;
          }
        | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      if (dryRun) {
        setPreview({
          total: json.total,
          valid: json.valid,
          errors: json.errors,
        });
        setCommit(null);
      } else {
        setCommit({
          total: json.total,
          valid: json.valid,
          imported: json.imported ?? 0,
          errors: json.errors,
        });
        setPreview(null);
        notify.success(t("toastImported", { count: json.imported ?? 0 }));
        router.refresh();
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Card.Content className={["gap-4 p-5"].filter(Boolean).join(" ")}>
        <div className="flex flex-wrap items-center gap-3">
          <ActionLink
            href="/api/members/import-template"
            className={buttonVariants({
              variant: actionVariant("default", "flat"),
            })}
          >
            {<Download className="h-4 w-4" aria-hidden />}
            {t("downloadTemplate")}
          </ActionLink>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onPress={() => fileInputRef.current?.click()}
            variant={actionVariant("default", "flat")}
          >
            {<FileSpreadsheet className="h-4 w-4" aria-hidden />}
            {file ? file.name : t("chooseFile")}
          </Button>
          <Button
            isDisabled={!file}
            onPress={() => post(true)}
            variant={actionVariant("primary", "flat")}
            isPending={busy}
          >
            {busy ? <Spinner size="sm" tone="current" /> : null}
            {t("check")}
          </Button>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {preview ? (
          <div className="rounded-lg border border-ink-200 p-4">
            <p className="text-sm font-medium">{t("previewTitle")}</p>
            <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-ink-400">{t("totalRows")}: </span>
                {preview.total}
              </div>
              <div>
                <span className="text-ink-400">{t("validRows")}: </span>
                <span className="font-medium text-success">
                  {preview.valid}
                </span>
              </div>
              <div>
                <span className="text-ink-400">{t("errorRows")}: </span>
                <span className="font-medium text-danger">
                  {preview.errors.length}
                </span>
              </div>
            </div>

            {preview.total > 0 ? (
              <ProgressBar
                aria-label={t("previewTitle")}
                size="sm"
                className="mt-3"
                value={
                  preview.total > 0
                    ? Math.round((preview.valid / preview.total) * 100)
                    : 0
                }
                tone="success"
              >
              </ProgressBar>
            ) : null}

            {preview.errors.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs text-warning-600">
                  {t("skippedWarning")}
                </p>
                <div className="mt-2 max-h-64 overflow-auto rounded-md border border-ink-200">
                  <table className="w-full text-xs" aria-label={t("errorRows")}>
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-ink-400">
                        <th className="p-2">{t("colRow")}</th>
                        <th className="p-2">{t("colMessages")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.errors.slice(0, 200).map((rowError) => (
                        <tr
                          key={rowError.row}
                          className="border-b border-ink-100 last:border-none"
                        >
                          <td className="p-2 font-medium">{rowError.row}</td>
                          <td className="p-2">
                            <ul className="list-inside list-disc">
                              {rowError.messages.map((message, index) => (
                                <li key={index}>{message}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.errors.length > 200 ? (
                    <p className="p-2 text-xs text-ink-400">
                      {t("moreErrors", { count: preview.errors.length - 200 })}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <Button
                isDisabled={preview.valid === 0}
                onPress={() => post(false)}
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {t("importButton")}
              </Button>
            </div>
          </div>
        ) : null}

        {commit ? (
          <div className="rounded-lg border border-success-200 bg-success-50 p-4 text-sm">
            <p className="font-medium">{t("commitTitle")}</p>
            <p className="mt-1">
              {t("commitSummary", {
                imported: commit.imported,
                total: commit.total,
              })}
            </p>
            {commit.errors.length > 0 ? (
              <p className="mt-1 text-warning-600">
                {t("commitSkipped", { count: commit.errors.length })}
              </p>
            ) : null}
            <div className="mt-3">
              <ActionLink
                href="/uyeler"
                className={buttonVariants({
                  variant: actionVariant("primary", "flat"),
                  size: "sm",
                })}
              >
                {t("goToList")}
              </ActionLink>
            </div>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
