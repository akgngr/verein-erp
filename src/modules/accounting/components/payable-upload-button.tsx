"use client";

import { addToast, Button } from "@heroui/react";
import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

/** Gelen fatura yükle: PDF / XRechnung XML / foto. E-fatura ise alanlar önceden doldurulur. */
export function PayableUploadButton() {
  const t = useTranslations("accounting.payables");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/accounting/payables", { method: "POST", body });
      const result = (await response.json()) as { ok: boolean; id?: string; error?: string; source?: string };
      if (!result.ok) {
        addToast({ title: result.error ?? t("errors.upload"), color: "danger" });
        if (response.status === 409 && result.id) router.push(`/muhasebe/gelen-faturalar/${result.id}`);
        return;
      }
      addToast({ title: result.source === "MANUAL" ? t("uploadedManual") : t("uploadedEInvoice", { source: result.source ?? "" }), color: "success" });
      router.push(`/muhasebe/gelen-faturalar/${result.id}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <input ref={input} id="payable-upload" type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" className="hidden" aria-label={t("upload")} onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
      <Button color="primary" startContent={<FileUp className="h-4 w-4" aria-hidden />} isLoading={busy} onPress={() => input.current?.click()}>
        {t("upload")}
      </Button>
    </>
  );
}
