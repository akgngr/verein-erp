"use client";

import { notify } from "@/shared/components/ui/notify";import { Link as ActionLink, buttonVariants, Button } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { Download, Eye, Paperclip, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatDateTime } from "@/shared/utils";

import { deleteFileAction } from "../actions/delete-file";
import { INLINE_PREVIEW_EXTENSIONS } from "../constants";
import type { DocumentFileItem } from "../types";
import { TransferToAccountingButton } from "./transfer-to-accounting-button";

function getExtension(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === base.length - 1) return "";
  return base.slice(dotIndex + 1).toLowerCase();
}

function formatSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

/** Detay sayfası dosya listesi (8.3): indir / önizle (pdf-jpg-png) / sil. */
export function FileList({
  files,
  canUpdate,
  transfer,
}: {
  files: DocumentFileItem[];
  canUpdate: boolean;
  /** Gelen evrakta "Muhasebeye aktar" (EV-3; yalnız muhasebe kullanılabilir ve yetki varsa). */
  transfer?: boolean;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("documents.files");
  const router = useRouter();
  const [deleting, setDeleting] = useState<DocumentFileItem | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteFileAction({ fileId: deleting.id });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t("deletedToast"));
    setDeleting(null);
    router.refresh();
  };

  if (files.length === 0) {
    return <p className="text-sm text-ink-500">{t("empty")}</p>;
  }

  return (
    <>
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
                  href={`/api/documents/files/${file.id}`}
                  className={buttonVariants({
                    variant: actionVariant("default", "flat"),
                    size: "sm",
                  })}
                >
                  {<Download className="h-4 w-4" aria-hidden />}
                  {t("download")}
                </ActionLink>
                {previewable ? (
                  <ActionLink
                    href={`/api/documents/files/${file.id}?inline=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: actionVariant("default", "light"),
                      size: "sm",
                    })}
                  >
                    {<Eye className="h-4 w-4" aria-hidden />}
                    {t("preview")}
                  </ActionLink>
                ) : null}
                {transfer ? (
                  <TransferToAccountingButton fileId={file.id} />
                ) : null}
                {canUpdate ? (
                  <Button
                    isIconOnly
                    size="sm"
                    aria-label={t("deleteAria", { name: file.originalName })}
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

      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        message={t("deleteMessage", { name: deleting?.originalName ?? "" })}
        confirmLabel={tCommon("delete")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}
