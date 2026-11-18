"use client";

import { notify } from "@/shared/components/ui/notify";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { Download, Eye, Paperclip, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDateTime } from "@/shared/utils";

import { deleteMeetingFileAction } from "../actions/delete-file";
import { MAX_FILES_PER_MEETING } from "../constants";
import { getExtension } from "@/shared/files/validation";
import { INLINE_PREVIEW_EXTENSIONS } from "@/shared/files/file-types";
import type { MeetingFileItem } from "../types";
import { TextLink as ActionLink, buttonClassName, Button } from "@/shared/components/kit";

function formatSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

/**
 * Toplantı ekleri sekmesi (7.3 Ekler): dosya listesi (ad, boyut, yükleyen,
 * tarih), indirme, pdf/jpg/png önizleme, sürükle-bırak yükleme, silme.
 * KARAR: silme yetkisi durum bazlıdır — canDeleteFiles sunucuda hesaplanır:
 * APPROVED toplantıda yalnızca delete yetkisi (ADMIN), diğerinde update.
 */
export function FilesTab({
  meetingId,
  files,
  canUpload,
  canDeleteFiles,
  maxMb,
  allowedExtensions,
}: {
  meetingId: string;
  files: MeetingFileItem[];
  canUpload: boolean;
  canDeleteFiles: boolean;
  maxMb: number;
  allowedExtensions: readonly string[];
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.files");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState<MeetingFileItem | null>(null);

  const uploadFiles = async (selected: FileList | File[]) => {
    const list = Array.from(selected);
    if (list.length === 0) return;
    setUploading(true);
    let failed = 0;
    for (const file of list) {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch(`/api/meetings/${meetingId}/files`, {
          method: "POST",
          body,
        });
        const json = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !json.ok) {
          failed += 1;
          notify.error(json.error ?? t("uploadFailed"));
        }
      } catch {
        failed += 1;
        notify.error(t("uploadFailed"));
      }
    }
    setUploading(false);
    if (failed === 0 && list.length > 0) {
      notify.success(t("uploadedCountToast", { count: list.length }));
    }
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteMeetingFileAction({ fileId: deleting.id });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t("deletedToast"));
    setDeleting(null);
    router.refresh();
  };

  const limitReached = files.length >= MAX_FILES_PER_MEETING;

  return (
    <div className="flex flex-col gap-4">
      {canUpload ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            !limitReached && !uploading && inputRef.current?.click()
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && !limitReached && !uploading)
              inputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (!limitReached && !uploading)
              void uploadFiles(event.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? "border-accent bg-brand-50" : "border-ink-300 bg-ink-50"
          } ${limitReached ? "opacity-60" : ""}`}
        >
          <Upload className="h-6 w-6 text-ink-400" aria-hidden />
          <p className="text-sm">
            {limitReached
              ? t("limitReached", { count: MAX_FILES_PER_MEETING })
              : t("dropOrClick")}
          </p>
          <p className="text-xs text-ink-400">
            {t("rulesLine", {
              types: allowedExtensions.join(", "),
              maxMb,
              maxFiles: MAX_FILES_PER_MEETING,
            })}
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={allowedExtensions
              .map((extension) => `.${extension}`)
              .join(",")}
            onChange={(event) => {
              if (event.target.files) void uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {uploading ? (
            <p className="text-sm text-accent">{t("uploading")}</p>
          ) : null}
        </div>
      ) : null}

      {files.length === 0 ? (
        <p className="text-sm text-ink-500">{t("emptyMeeting")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((file) => {
            const previewable = INLINE_PREVIEW_EXTENSIONS.includes(
              getExtension(file.originalName),
            );
            return (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-200 bg-surface px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Paperclip
                    className="h-4 w-4 shrink-0 text-ink-400"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {file.originalName}
                    </span>
                    <span className="text-xs text-ink-400">
                      {formatSize(file.size)} — {file.uploadedByLabel} —{" "}
                      {formatDateTime(file.createdAt)}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <ActionLink
                    href={`/api/meetings/files/${file.id}`}
                    className={buttonClassName({
                      variant: actionVariant("default", "flat"),
                      size: "sm",
                    })}
                  >
                    {<Download className="h-4 w-4" aria-hidden />}
                    {t("download")}
                  </ActionLink>
                  {previewable ? (
                    <ActionLink
                      href={`/api/meetings/files/${file.id}?inline=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonClassName({
                        variant: actionVariant("default", "light"),
                        size: "sm",
                      })}
                    >
                      {<Eye className="h-4 w-4" aria-hidden />}
                      {t("preview")}
                    </ActionLink>
                  ) : null}
                  {canDeleteFiles ? (
                    <Button
                      isIconOnly
                      size="sm"
                      aria-label={t("deleteNamedAria", {
                        name: file.originalName,
                      })}
                      onPress={() => setDeleting(file)}
                      variant={actionVariant("danger", "light")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteAction")}
        message={t("deleteNamedMessage", {
          name: deleting?.originalName ?? "",
        })}
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
