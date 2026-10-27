"use client";

import { Button, addToast } from "@heroui/react";
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
          addToast({ title: json.error ?? "Dosya yüklenemedi.", color: "danger" });
        }
      } catch {
        failed += 1;
        addToast({ title: "Dosya yüklenemedi.", color: "danger" });
      }
    }
    setUploading(false);
    if (failed === 0 && list.length > 0) {
      addToast({ title: `${list.length} dosya yüklendi`, color: "success" });
    }
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await deleteMeetingFileAction({ fileId: deleting.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: "Dosya silindi.", color: "success" });
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
          onClick={() => !limitReached && !uploading && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !limitReached && !uploading) inputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (!limitReached && !uploading) void uploadFiles(event.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-medium border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? "border-primary bg-primary-50" : "border-default-300 bg-default-50"
          } ${limitReached ? "opacity-60" : ""}`}
        >
          <Upload className="h-6 w-6 text-default-400" aria-hidden />
          <p className="text-small">
            {limitReached
              ? `En fazla ${MAX_FILES_PER_MEETING} dosya eklenebilir.`
              : "Dosyaları buraya sürükleyin ya da seçmek için tıklayın"}
          </p>
          <p className="text-tiny text-default-400">
            İzinli türler: {allowedExtensions.join(", ")} — Dosya başına en fazla {maxMb} MB —
            Toplantı başına en fazla {MAX_FILES_PER_MEETING} dosya
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={allowedExtensions.map((extension) => `.${extension}`).join(",")}
            onChange={(event) => {
              if (event.target.files) void uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {uploading ? <p className="text-small text-primary">Yükleniyor…</p> : null}
        </div>
      ) : null}

      {files.length === 0 ? (
        <p className="text-small text-default-500">Bu toplantıya henüz dosya eklenmemiş.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((file) => {
            const previewable = INLINE_PREVIEW_EXTENSIONS.includes(
              getExtension(file.originalName),
            );
            return (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-medium border border-default-200 bg-content1 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-default-400" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-small font-medium">
                      {file.originalName}
                    </span>
                    <span className="text-tiny text-default-400">
                      {formatSize(file.size)} — {file.uploadedByLabel} —{" "}
                      {formatDateTime(file.createdAt)}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    as="a"
                    href={`/api/meetings/files/${file.id}`}
                    size="sm"
                    variant="flat"
                    startContent={<Download className="h-4 w-4" aria-hidden />}
                  >
                    İndir
                  </Button>
                  {previewable ? (
                    <Button
                      as="a"
                      href={`/api/meetings/files/${file.id}?inline=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      variant="light"
                      startContent={<Eye className="h-4 w-4" aria-hidden />}
                    >
                      Önizle
                    </Button>
                  ) : null}
                  {canDeleteFiles ? (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      aria-label={`${file.originalName} dosyasını sil`}
                      onPress={() => setDeleting(file)}
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
        title="Dosyayı sil"
        message={`"${deleting?.originalName ?? ""}" dosyası toplantıdan kaldırılacak. Diskteki dosya korunur. Onaylıyor musunuz?`}
        confirmLabel="Sil"
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
