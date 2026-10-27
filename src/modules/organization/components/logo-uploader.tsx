"use client";

import { Button, Card, CardBody, addToast } from "@heroui/react";
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
      const res = await fetch("/api/organization/logo", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: string; logoVersion?: string }
        | null;
      if (!res.ok || !json?.ok) {
        addToast({ title: json?.error ?? t("logoError"), color: "danger" });
        return;
      }
      setVersion(json.logoVersion ?? null);
      addToast({ title: t("logoUploadedToast"), color: "success" });
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
      const json = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        addToast({ title: json?.error ?? t("logoError"), color: "danger" });
        return;
      }
      setVersion(null);
      addToast({ title: t("logoRemovedToast"), color: "success" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card shadow="sm" className="max-w-3xl">
      <CardBody className="gap-3 p-6">
        <div>
          <p className="text-small font-semibold">{t("logoTitle")}</p>
          <p className="text-tiny text-default-400">{t("logoDescription")}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-medium border border-default-200 bg-default-50">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt={t("logoTitle")} className="max-h-24 max-w-32 object-contain" />
            ) : (
              <span className="px-2 text-center text-tiny text-default-400">{t("logoNone")}</span>
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
              variant="bordered"
              color="primary"
              startContent={<ImageUp className="h-4 w-4" aria-hidden />}
              isLoading={busy}
              onPress={() => inputRef.current?.click()}
            >
              {version ? t("logoChange") : t("logoUpload")}
            </Button>
            {version ? (
              <Button
                size="sm"
                variant="flat"
                color="danger"
                startContent={<Trash2 className="h-4 w-4" aria-hidden />}
                isDisabled={busy}
                onPress={() => void remove()}
              >
                {t("logoRemove")}
              </Button>
            ) : null}
            {logoOriginalName ? (
              <span className="text-tiny text-default-400">{logoOriginalName}</span>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
