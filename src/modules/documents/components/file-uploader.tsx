"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Spinner } from "@/shared/components/kit";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { FileUp, Paperclip, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent } from "react";

import { cn } from "@/shared/utils";

import { ALLOWED_EXTENSIONS, MAX_FILES_PER_DOCUMENT } from "../constants";

export type PendingFile = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

/** Form, evrak oluştuktan sonra yükleme komutu gönderir (ref'siz akış). */
export type UploadCommand = {
  documentId: string;
  nonce: number;
  onDone: (failedCount: number) => void;
};

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

/**
 * Dosya yükleme alanı (8.2 / 8.3): sürükle-bırak + dosya seçimi; istemci
 * tarafı tür/boyut ön kontrolü; evrak başına MAX_FILES_PER_DOCUMENT sınırı.
 *
 * - mode "create": dosyalar önce listede bekler; kayıt sonrası form,
 *   uploadAll(documentId) ile SIRAYLA yükler (7. bölüm: tek istekte tek dosya).
 * - mode "detail": seçilen dosyalar hemen yüklenir; sonra liste tazelenir.
 */
export function FileUploader({
  mode,
  documentId,
  existingCount = 0,
  maxMb,
  onUploaded,
  onPendingCountChange,
  uploadCommand,
  onAnalyze,
  analyzingId,
}: {
  mode: "create" | "detail";
  /** "Evraktan doldur": seçilen (henüz yüklenmemiş) dosyayı formu doldurmak için analiz eder. */
  onAnalyze?: (file: File, id: string) => void;
  analyzingId?: string | null;
  documentId?: string;
  existingCount?: number;
  maxMb: number;
  onUploaded?: () => void;
  onPendingCountChange?: (count: number) => void;
  /** Yalnızca mode "create": form evrak kaydını tamamladığında komut gönderir. */
  uploadCommand?: UploadCommand | null;
}) {
  const t = useTranslations("documents.files");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const capacity =
    MAX_FILES_PER_DOCUMENT -
    existingCount -
    pending.filter((p) => p.status !== "error").length;

  // Üst bileşene (document-form) bekleyen dosya sayısını bildirir.
  useEffect(() => {
    onPendingCountChange?.(
      pending.filter((p) => p.status === "pending" || p.status === "uploading")
        .length,
    );
  }, [pending, onPendingCountChange]);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(files)) {
      if (
        next.length + pending.length >=
        MAX_FILES_PER_DOCUMENT - existingCount
      ) {
        notify.warning(t("maxFilesToast", { count: MAX_FILES_PER_DOCUMENT }));
        break;
      }
      if (!ALLOWED_EXTENSIONS.includes(getExtension(file.name))) {
        notify.warning(t("typeNotAccepted", { name: file.name }));
        continue;
      }
      if (file.size > maxMb * 1024 * 1024) {
        notify.warning(t("tooLarge", { name: file.name, maxMb }));
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${next.length}`,
        file,
        status: "pending",
      });
    }
    if (next.length > 0) setPending((current) => [...current, ...next]);
  };

  const uploadOne = async (
    documentIdForUpload: string,
    item: PendingFile,
  ): Promise<boolean> => {
    const body = new FormData();
    body.append("file", item.file);
    const response = await fetch(
      `/api/documents/${documentIdForUpload}/files`,
      {
        method: "POST",
        body,
      },
    );
    if (response.ok) return true;
    let error = t("uploadFailed");
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) error = data.error;
    } catch {
      // Yanıt gövdesi JSON değilse genel mesaj korunur.
    }
    throw new Error(error);
  };

  const uploadAll = async (documentIdForUpload: string): Promise<number> => {
    setBusy(true);
    let failed = 0;
    try {
      for (const item of pending) {
        setPending((current) =>
          current.map((p) =>
            p.id === item.id ? { ...p, status: "uploading" } : p,
          ),
        );
        try {
          await uploadOne(documentIdForUpload, item);
          setPending((current) =>
            current.map((p) =>
              p.id === item.id ? { ...p, status: "done" } : p,
            ),
          );
        } catch (error) {
          failed += 1;
          setPending((current) =>
            current.map((p) =>
              p.id === item.id
                ? {
                    ...p,
                    status: "error",
                    error:
                      error instanceof Error
                        ? error.message
                        : t("errorGeneric"),
                  }
                : p,
            ),
          );
        }
      }
      // Tamamlananları listeden temizle; hatalılar deneme için listede kalır.
      setPending((current) =>
        current.filter((p) => p.status === "error" || p.status === "pending"),
      );
      return failed;
    } finally {
      setBusy(false);
    }
  };

  // Yükleme komutu geldiğinde bekleyen dosyaları sırayla yükler (tek istekte tek dosya).
  useEffect(() => {
    if (!uploadCommand) return;
    let cancelled = false;
    void (async () => {
      const failed = await uploadAll(uploadCommand.documentId);
      if (!cancelled) uploadCommand.onDone(failed);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadCommand]);

  const uploadImmediately = async (items: PendingFile[]) => {
    if (!documentId || items.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (const item of items) {
      try {
        await uploadOne(documentId, item);
        ok += 1;
      } catch (error) {
        notify.error(error instanceof Error ? error.message : t("uploadFailed"));
      }
    }
    setBusy(false);
    if (ok > 0) {
      notify.success(t("uploadedToast"));
      onUploaded?.();
      router.refresh();
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    if (mode === "detail") {
      const files = Array.from(event.dataTransfer.files).map((file, index) => ({
        id: `d-${Date.now()}-${index}`,
        file,
        status: "pending" as const,
      }));
      uploadImmediately(files);
    } else {
      addFiles(event.dataTransfer.files);
    }
  };

  const onFileInput = () => {
    const files = inputRef.current?.files ?? null;
    if (mode === "detail") {
      const items = Array.from(files ?? []).map((file, index) => ({
        id: `i-${Date.now()}-${index}`,
        file,
        status: "pending" as const,
      }));
      if (inputRef.current) inputRef.current.value = "";
      uploadImmediately(items);
    } else {
      addFiles(files);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        aria-label={t("addAria")}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ")
            inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 bg-ink-50 px-4 py-6 text-center transition-colors",
          dragOver && "border-brand-400 bg-brand-50",
          capacity <= 0 && "pointer-events-none opacity-50",
        )}
      >
        <UploadCloud className="h-6 w-6 text-ink-400" aria-hidden />
        <p className="text-sm text-ink-500">
          {t("dropHint")}{" "}
          <span className="text-accent">{t("dropHintSelect")}</span>
        </p>
        <p className="text-xs text-ink-400">
          {t("rules", {
            extensions: ALLOWED_EXTENSIONS.join(", "),
            maxMb,
            capacity: Math.max(0, capacity),
          })}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileInput}
          accept={ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(
            ",",
          )}
          disabled={busy || capacity <= 0}
        />
      </div>

      {pending.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border border-ink-200 bg-surface px-3 py-2"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <Paperclip
                  className="h-4 w-4 shrink-0 text-ink-400"
                  aria-hidden
                />
                <span className="truncate">{item.file.name}</span>
                <span className="shrink-0 text-xs text-ink-400">
                  ({formatSize(item.file.size)})
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {item.status === "uploading" ? (
                  <span className="text-xs text-accent">{t("uploading")}</span>
                ) : null}
                {item.status === "done" ? (
                  <span className="text-xs text-success">{t("uploaded")}</span>
                ) : null}
                {item.status === "error" ? (
                  <span className="text-xs text-danger">
                    {item.error ?? t("errorGeneric")}
                  </span>
                ) : null}
                {onAnalyze && item.status === "pending" ? (
                  <Button
                    size="sm"
                    isDisabled={Boolean(analyzingId)}
                    onPress={() => onAnalyze(item.file, item.id)}
                    variant={actionVariant("primary", "flat")}
                    isPending={analyzingId === item.id}
                  >
                    {analyzingId === item.id ? (
                      <Spinner size="sm" tone="current" />
                    ) : null}
                    {analyzingId === item.id ? null : (
                      <Sparkles className="h-4 w-4" aria-hidden />
                    )}
                    {t("analyze")}
                  </Button>
                ) : null}
                {item.status === "pending" || item.status === "error" ? (
                  <Button
                    isIconOnly
                    size="sm"
                    aria-label={t("removeFromListAria", {
                      name: item.file.name,
                    })}
                    onPress={() =>
                      setPending((current) =>
                        current.filter((p) => p.id !== item.id),
                      )
                    }
                    variant={actionVariant("default", "light")}
                  >
                    <Trash2 className="h-4 w-4 text-ink-500" aria-hidden />
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {mode === "detail" && busy ? (
        <p className="flex items-center gap-2 text-xs text-ink-500">
          <FileUp className="h-4 w-4 animate-pulse" aria-hidden />{" "}
          {t("uploading")}
        </p>
      ) : null}
    </div>
  );
}
