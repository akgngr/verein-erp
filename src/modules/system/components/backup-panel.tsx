"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CheckCircle2,
  DatabaseBackup,
  Download,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/shared/components/kit";

import {
  createBackupAction,
  deleteBackupAction,
  saveBackupConfigAction,
  verifyBackupAction,
} from "../actions/backup-actions";
import type { BackupOverview } from "../services/backups";
import type { BackupVerificationResult } from "../services/backup-bundle";

interface BackupPanelProps {
  initialOverview: BackupOverview;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDateTime(iso: string | null, locale: string, fallback: string): string {
  if (!iso) return fallback;
  try {
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

export function BackupPanel({ initialOverview }: BackupPanelProps) {
  const t = useTranslations("system.backups");
  const locale = useLocale();
  const [overview, setOverview] = useState<BackupOverview>(initialOverview);
  const [enabled, setEnabled] = useState(initialOverview.config.enabled);
  const [retentionCount, setRetentionCount] = useState(
    initialOverview.config.retentionCount,
  );
  const [intervalHours, setIntervalHours] = useState(
    initialOverview.config.intervalHours,
  );

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [lastVerifyResult, setLastVerifyResult] =
    useState<BackupVerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleCreateBackup() {
    setBusyAction("create");
    setFeedback(null);
    try {
      const res = await createBackupAction({});
      if (res.ok) {
        setOverview(res.data.overview);
        setFeedback({
          kind: "success",
          text:
            res.data.prunedCount > 0
              ? t("messages.createdWithPrune", { count: res.data.prunedCount })
              : t("messages.created"),
        });
      } else {
        setFeedback({ kind: "error", text: res.error || t("messages.createFailed") });
      }
    } catch {
      setFeedback({ kind: "error", text: t("messages.createFailed") });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveConfig() {
    setBusyAction("config");
    setFeedback(null);
    try {
      const res = await saveBackupConfigAction({
        enabled,
        retentionCount,
        intervalHours,
      });
      if (res.ok) {
        setOverview((prev) => ({ ...prev, config: res.data }));
        setFeedback({ kind: "success", text: t("messages.configSaved") });
      } else {
        setFeedback({ kind: "error", text: res.error || t("messages.configFailed") });
      }
    } catch {
      setFeedback({ kind: "error", text: t("messages.configFailed") });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleVerifyBackup(id: string) {
    setBusyAction(`verify:${id}`);
    setFeedback(null);
    try {
      const res = await verifyBackupAction({ id });
      if (res.ok) {
        setOverview(res.data.overview);
        setLastVerifyResult(res.data.verification);
        setFeedback({
          kind: res.data.verification.ok ? "success" : "error",
          text: res.data.verification.ok
            ? t("messages.verifyPassed")
            : t("messages.verifyFailed", {
                code: res.data.verification.errorCode ?? "UNKNOWN",
              }),
        });
      } else {
        setFeedback({ kind: "error", text: res.error || t("messages.verifyError") });
      }
    } catch {
      setFeedback({ kind: "error", text: t("messages.verifyError") });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteBackup(id: string) {
    if (!window.confirm(t("messages.deleteConfirm"))) return;
    setBusyAction(`delete:${id}`);
    setFeedback(null);
    try {
      const res = await deleteBackupAction({ id });
      if (res.ok) {
        setOverview(res.data);
        setFeedback({ kind: "success", text: t("messages.deleted") });
      } else {
        setFeedback({ kind: "error", text: res.error || t("messages.deleteFailed") });
      }
    } catch {
      setFeedback({ kind: "error", text: t("messages.deleteFailed") });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUploadVerify(file: File | null) {
    if (!file) return;
    setBusyAction("upload-verify");
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/system/backups/verify", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as BackupVerificationResult & {
        error?: string;
      };
      if (!response.ok) {
        setFeedback({
          kind: "error",
          text: data.error || t("messages.verifyError"),
        });
        return;
      }
      setLastVerifyResult(data);
      setFeedback({
        kind: data.ok ? "success" : "error",
        text: data.ok
          ? t("messages.uploadVerifyPassed")
          : t("messages.verifyFailed", { code: data.errorCode ?? "UNKNOWN" }),
      });
    } catch {
      setFeedback({ kind: "error", text: t("messages.verifyError") });
    } finally {
      setBusyAction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      {!overview.encryptionReady && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t("encryptionMissingTitle")}</p>
            <p className="mt-1 opacity-90">{t("encryptionMissingBody")}</p>
          </div>
        </div>
      )}

      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`rounded-xl border p-3 text-sm ${
            feedback.kind === "error"
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-success/40 bg-success/10 text-success"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-secondary">
            {t("stats.encryption")}
          </p>
          <div className="mt-2 flex items-center gap-2 text-base font-semibold">
            {overview.encryptionReady ? (
              <>
                <ShieldCheck className="h-5 w-5 text-success" />
                <span>{t("stats.encryptionReady")}</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-5 w-5 text-danger" />
                <span>{t("stats.encryptionUnavailable")}</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-secondary">{t("stats.cipherLabel")}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-secondary">
            {t("stats.lastBackup")}
          </p>
          <p className="mt-2 text-base font-semibold">
            {formatDateTime(
              overview.stats.lastBackupAt,
              locale,
              t("stats.never"),
            )}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {t("stats.readySummary", {
              count: overview.stats.readyCount,
              size: formatBytes(overview.stats.totalBytes),
            })}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-secondary">
            {t("stats.lastVerification")}
          </p>
          <p className="mt-2 text-base font-semibold">
            {overview.stats.lastVerificationStatus === "PASSED"
              ? t("status.verifiedPassed")
              : overview.stats.lastVerificationStatus === "FAILED"
                ? t("status.verifiedFailed")
                : t("stats.never")}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {formatDateTime(
              overview.stats.lastVerifiedAt,
              locale,
              t("stats.notVerifiedYet"),
            )}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium text-secondary">
            {t("stats.schemaVersion")}
          </p>
          <p className="mt-2 truncate font-mono text-xs font-semibold">
            {overview.currentSchemaVersion ?? t("stats.unknown")}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {t("stats.migrationCount", {
              count: overview.currentMigrationCount,
            })}
          </p>
        </div>
      </div>

      {/* Controls: Manual Backup + Policy Settings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">{t("manual.title")}</h2>
              <p className="mt-1 text-sm text-secondary">
                {t("manual.description")}
              </p>
            </div>
            <DatabaseBackup className="h-6 w-6 shrink-0 text-primary" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onPress={handleCreateBackup}
              isDisabled={!overview.encryptionReady || busyAction !== null}
            >
              {busyAction === "create" ? t("manual.running") : t("manual.cta")}
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <div>
            <h2 className="text-base font-semibold">{t("policy.title")}</h2>
            <p className="mt-1 text-sm text-secondary">
              {t("policy.description")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span>{t("policy.enabled")}</span>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
              <span>{t("policy.retentionCount")}</span>
              <input
                type="number"
                min={1}
                max={90}
                value={retentionCount}
                onChange={(e) => setRetentionCount(Number(e.target.value))}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-secondary">
              <span>{t("policy.intervalHours")}</span>
              <input
                type="number"
                min={6}
                max={168}
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
              />
            </label>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onPress={handleSaveConfig}
                isDisabled={busyAction !== null}
              >
                {busyAction === "config" ? t("policy.saving") : t("policy.save")}
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Non-destructive Archive Verification Upload */}
      <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">
              {t("uploadVerify.title")}
            </h2>
            <p className="mt-1 text-sm text-secondary">
              {t("uploadVerify.description")}
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".vbak,application/octet-stream"
              onChange={(e) =>
                void handleUploadVerify(e.target.files?.[0] ?? null)
              }
              className="hidden"
              id="system-backup-verify-upload"
            />
            <Button
              variant="secondary"
              onPress={() => fileInputRef.current?.click()}
              isDisabled={!overview.encryptionReady || busyAction !== null}
            >
              <Upload className="h-4 w-4" />
              <span>
                {busyAction === "upload-verify"
                  ? t("uploadVerify.running")
                  : t("uploadVerify.cta")}
              </span>
            </Button>
          </div>
        </div>

        {lastVerifyResult && (
          <div className="rounded-lg border border-border bg-background/60 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              {lastVerifyResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-danger" />
              )}
              <span>
                {lastVerifyResult.ok
                  ? t("verifyDetail.passedHeading")
                  : t("verifyDetail.failedHeading", {
                      code: lastVerifyResult.errorCode ?? "UNKNOWN",
                    })}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-secondary">
              <div>
                <span className="font-medium text-foreground">
                  {t("verifyDetail.archiveSha")}:
                </span>{" "}
                <span className="font-mono">
                  {lastVerifyResult.archiveSha256.slice(0, 16)}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">
                  {t("verifyDetail.dbIntegrity")}:
                </span>{" "}
                {lastVerifyResult.dbIntegrityOk
                  ? t("verifyDetail.ok")
                  : t("verifyDetail.failed")}
              </div>
              <div>
                <span className="font-medium text-foreground">
                  {t("verifyDetail.filesChecked")}:
                </span>{" "}
                {lastVerifyResult.checkedUploadFiles}
              </div>
              <div>
                <span className="font-medium text-foreground">
                  {t("verifyDetail.schemaCompatibility")}:
                </span>{" "}
                {t(`schemaCompatibility.${lastVerifyResult.schemaCompatibility}`)}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Backups History Table */}
      <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <h2 className="text-base font-semibold">{t("list.title")}</h2>
        {overview.backups.length === 0 ? (
          <p className="text-sm text-secondary">{t("list.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-secondary">
                <tr>
                  <th className="py-2 pr-3 font-medium">{t("list.date")}</th>
                  <th className="py-2 pr-3 font-medium">{t("list.status")}</th>
                  <th className="py-2 pr-3 font-medium">{t("list.contents")}</th>
                  <th className="py-2 pr-3 font-medium">{t("list.size")}</th>
                  <th className="py-2 pr-3 font-medium">
                    {t("list.verification")}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {t("list.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview.backups.map((item) => (
                  <tr key={item.id} className="align-middle">
                    <td className="py-3 pr-3">
                      <div className="font-medium">
                        {formatDateTime(item.createdAt, locale, "-")}
                      </div>
                      <div className="text-xs text-secondary">
                        {item.trigger === "scheduled"
                          ? t("trigger.scheduled")
                          : t("trigger.manual")}
                        {item.encryptionKeyVersion
                          ? ` · ${item.encryptionKeyVersion}`
                          : ""}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.status === "READY"
                            ? "bg-success/15 text-success"
                            : "bg-danger/15 text-danger"
                        }`}
                      >
                        {item.status === "READY"
                          ? t("status.ready")
                          : t("status.failed")}
                      </span>
                      {item.errorCode && (
                        <div className="mt-1 font-mono text-xs text-danger">
                          {item.errorCode}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs text-secondary">
                      <div>
                        {t("list.dbSummary", {
                          tables: item.dbTableCount,
                          rows: item.dbRowCount,
                        })}
                      </div>
                      <div>
                        {t("list.uploadSummary", {
                          files: item.uploadFileCount,
                        })}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      <div>{formatBytes(item.archiveSizeBytes)}</div>
                      {item.archiveSha256 && (
                        <div className="font-mono text-secondary">
                          {item.archiveSha256.slice(0, 12)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      {item.verificationStatus === "PASSED" ? (
                        <span className="text-success font-medium">
                          {t("status.verifiedPassed")}
                        </span>
                      ) : item.verificationStatus === "FAILED" ? (
                        <span className="text-danger font-medium">
                          {t("status.verifiedFailed")}
                        </span>
                      ) : (
                        <span className="text-secondary">
                          {t("stats.notVerifiedYet")}
                        </span>
                      )}
                      {item.schemaCompatibility && (
                        <div className="text-secondary">
                          {t(`schemaCompatibility.${item.schemaCompatibility}`)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        {item.hasArchive && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onPress={() => void handleVerifyBackup(item.id)}
                              isDisabled={busyAction !== null}
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              <span>{t("actions.verify")}</span>
                            </Button>
                            <a
                              href={`/api/system/backups/${encodeURIComponent(item.id)}`}
                              download
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-background"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>{t("actions.download")}</span>
                            </a>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onPress={() => void handleDeleteBackup(item.id)}
                          isDisabled={busyAction !== null}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t("actions.delete")}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
