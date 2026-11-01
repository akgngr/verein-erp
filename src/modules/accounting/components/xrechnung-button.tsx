"use client";

import { addToast, Button } from "@heroui/react";
import { FileCode2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** XRechnung (UBL) indir: eksik alan varsa sunucunun listesini gösterir (422). */
export function XRechnungButton({ invoiceId, number }: { invoiceId: string; number: string }) {
  const t = useTranslations("accounting.invoices.xrechnung");
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="bordered"
      startContent={<FileCode2 className="h-4 w-4" aria-hidden />}
      isLoading={busy}
      onPress={async () => {
        setBusy(true);
        try {
          const response = await fetch(`/api/accounting/invoices/${invoiceId}/xrechnung`);
          if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { error?: string };
            addToast({ title: result.error ?? t("failed"), color: "danger", timeout: 9000 });
            return;
          }
          const url = URL.createObjectURL(await response.blob());
          const link = document.createElement("a");
          link.href = url;
          link.download = `XRechnung_${number}.xml`;
          link.click();
          URL.revokeObjectURL(url);
        } finally {
          setBusy(false);
        }
      }}
    >
      {t("download")}
    </Button>
  );
}
