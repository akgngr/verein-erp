"use client";
import { statusTone } from "@/shared/components/ui/status-appearance";
import { toast, Button, Spinner } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

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
      if (!result.ok) return void toast(result.error, { variant: "danger" });
      toast(result.data.duplicate ? t("transferDuplicate") : t("transferred"), {
        variant: statusTone(result.data.duplicate ? "warning" : "success"),
      });
      router.push(`/muhasebe/gelen-faturalar/${result.data.payableId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      onPress={transfer}
      variant={actionVariant("primary", "flat")}
      isPending={busy}
    >
      {busy ? <Spinner size="sm" color="current" /> : null}
      {busy ? null : <Landmark className="h-4 w-4" aria-hidden />}
      {t("transfer")}
    </Button>
  );
}
