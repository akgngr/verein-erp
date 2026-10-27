"use client";

import { Button, addToast } from "@heroui/react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import type { BookingFileRow } from "../types";
import { deleteBookingFileAction } from "../actions/delete-file";

/**
 * Fiş belgeleri paneli (§ 11.3 + § 9): listele/indir/yükle/sil.
 * Yükleme POST /api/accounting/[id]/files (update veya create izni);
 * silme delete izni + kilitli yıl reddi sunucuda.
 */
export function FilesPanel({
  bookingId,
  files,
  canUpdate,
  canDelete,
}: {
  bookingId: string;
  files: BookingFileRow[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("accounting.detail.files");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookingFileRow | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/accounting/${bookingId}/files`, {
        method: "POST",
        body,
      });
      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!result.ok) {
        addToast({ title: result.error ?? "Yükleme başarısız.", color: "danger" });
        return;
      }
      addToast({ title: result.ok ? "Belge yüklendi." : "", color: "success" });
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteBookingFileAction({ fileId: deleteTarget.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("delete") + " ✓", color: "success" });
    setDeleteTarget(null);
  };

  const formatSize = (size: number) =>
    size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;

  return (
    <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">
          {t("title")}
        </h2>
        {canUpdate ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
            <Button
              size="sm"
              color="primary"
              variant="flat"
              startContent={<Upload className="h-4 w-4" aria-hidden />}
              isLoading={busy}
              onPress={() => inputRef.current?.click()}
            >
              {t("upload")}
            </Button>
          </>
        ) : null}
      </div>

      {files.length === 0 ? (
        <p className="text-small text-default-400">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-2 border-b border-default-100 py-1.5 last:border-none">
              <span className="flex min-w-0 items-center gap-2 text-small">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-default-400" aria-hidden />
                <span className="truncate">{file.originalName}</span>
                <span className="shrink-0 text-tiny text-default-400">{formatSize(file.size)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Button
                  as="a"
                  href={`/api/accounting/files/${file.id}`}
                  size="sm"
                  variant="light"
                  isIconOnly
                  aria-label={t("download")}
                  startContent={<Download className="h-4 w-4" aria-hidden />}
                />
                {canDelete ? (
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    isIconOnly
                    aria-label={t("delete")}
                    startContent={<Trash2 className="h-4 w-4" aria-hidden />}
                    onPress={() => setDeleteTarget(file)}
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("delete")}
        message={deleteTarget?.originalName ?? ""}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
