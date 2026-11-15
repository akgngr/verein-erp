"use client";

import { Button, addToast } from "@heroui/react";
import { Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { transferToAccountingAction } from "../actions/transfer-to-accounting";

/**
 * "Muhasebeye aktar" (docs/specs/DOCUMENTS_AI.md, EV-3). İş sunucuda, muhasebenin bildirilmiş sunucu API'si
 * üzerinden yapılır (module.config.ts → access); düğme yalnız muhasebe kullanılabilir ve yetki varsa çizilir.
 */
export function TransferToAccountingButton({ fileId }: { fileId: string }) {
  const t = useTranslations("documents.actions");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const transfer = async () => {
    setBusy(true);
    try {
      const result = await transferToAccountingAction({ fileId });
      if (!result.ok) return void addToast({ title: result.error, color: "danger" });
      addToast({ title: result.data.duplicate ? t("transferDuplicate") : t("transferred"), color: result.data.duplicate ? "warning" : "success" });
      router.push(`/muhasebe/gelen-faturalar/${result.data.payableId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="flat" color="primary" startContent={busy ? null : <Landmark className="h-4 w-4" aria-hidden />} isLoading={busy} onPress={transfer}>
      {t("transfer")}
    </Button>
  );
}
