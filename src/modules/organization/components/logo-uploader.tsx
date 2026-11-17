"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";
import { SurfaceCard } from "@/shared/components/ui/surface-card";

/**
 * Logo yükleme kutusu: Dernek Bilgileri sayfasının üstünde.
 * Yükleme form kaydından bağımsızdır; dosya seçilir seçilmez API'ye gider.
 */
export function LogoUploader({
  logoVersion,
  logoOriginalName,
}: {
  logoVersion: string | null;
  logoOriginalName: string | null;
}) {
  const t = useTranslations("organization");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState<string | null>(logoVersion);
  const [busy, setBusy] = useState(false);

  const previewSrc = version ? `/api/organization/logo?v=${version}` : null;

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/organization/logo", {
        method: "POST",
        body,
      });
      const json = (await res.json().catch(() => null)) as {
        ok: boolean;
        error?: string;
        logoVersion?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        notify(json?.error ?? t("logoError"), "danger");
        return;
      }
      setVersion(json.logoVersion ?? null);
      notify(t("logoUploadedToast"), "success");
      router.refresh();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/organization/logo", { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as {
        ok: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        notify(json?.error ?? t("logoError"), "danger");
        return;
      }
      setVersion(null);
      notify(t("logoRemovedToast"), "success");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SurfaceCard className="max-w-3xl" contentClassName="gap-3 p-6">
      <div>
        <p className="text-sm font-semibold">{t("logoTitle")}</p>
        <p className="text-xs text-ink-400">{t("logoDescription")}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-ink-50">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={t("logoTitle")}
              className="max-h-24 max-w-32 object-contain"
            />
          ) : (
            <span className="px-2 text-center text-xs text-ink-400">
              {t("logoNone")}
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <ActionButton
            color="primary"
            variant="bordered"
            startIcon={<ImageUp className="h-4 w-4" aria-hidden />}
            isPending={busy}
            onPress={() => inputRef.current?.click()}
          >
            {version ? t("logoChange") : t("logoUpload")}
          </ActionButton>
          {version ? (
            <ActionButton
              color="danger"
              variant="flat"
              startIcon={<Trash2 className="h-4 w-4" aria-hidden />}
              isDisabled={busy}
              onPress={() => void remove()}
            >
              {t("logoRemove")}
            </ActionButton>
          ) : null}
          {logoOriginalName ? (
            <span className="text-xs text-ink-400">{logoOriginalName}</span>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
