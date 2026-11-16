"use client";
import { toast, Card, Button, Spinner } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { ImageUp, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/**
 * Logo yükleme kutusu (kullanıcı isteği): Dernek Bilgileri sayfasının üstünde;
 * yalnızca update yetkili form görünümünde sunulur (profile-view kararı).
 * Yükleme form kaydından BAĞIMSIZDIR — dosya seçilir seçilmez API'ye gider,
 * başarılıysa önizleme anında döner (logoVersion cache-bust) ve sayfa tazelenir.
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
        toast(json?.error ?? t("logoError"), { variant: "danger" });
        return;
      }
      setVersion(json.logoVersion ?? null);
      toast(t("logoUploadedToast"), { variant: "success" });
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
        toast(json?.error ?? t("logoError"), { variant: "danger" });
        return;
      }
      setVersion(null);
      toast(t("logoRemovedToast"), { variant: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={["max-w-3xl", "shadow-sm border border-ink-200/80"]
        .filter(Boolean)
        .join(" ")}
    >
      <Card.Content className={["gap-3 p-6"].filter(Boolean).join(" ")}>
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
            <Button
              size="sm"
              onPress={() => inputRef.current?.click()}
              variant={actionVariant("primary", "bordered")}
              isPending={busy}
            >
              {busy ? <Spinner size="sm" color="current" /> : null}
              {<ImageUp className="h-4 w-4" aria-hidden />}
              {version ? t("logoChange") : t("logoUpload")}
            </Button>
            {version ? (
              <Button
                size="sm"
                isDisabled={busy}
                onPress={() => void remove()}
                variant={actionVariant("danger", "flat")}
              >
                {<Trash2 className="h-4 w-4" aria-hidden />}
                {t("logoRemove")}
              </Button>
            ) : null}
            {logoOriginalName ? (
              <span className="text-xs text-ink-400">{logoOriginalName}</span>
            ) : null}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
