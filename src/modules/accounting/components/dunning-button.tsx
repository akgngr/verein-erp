"use client";

import { addToast, Button } from "@heroui/react";
import { MailWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createDunningAction } from "../actions/dunning-actions";

/** Sonraki ihtar kademesini oluşturur ve mektubu (PDF) yeni sekmede açar. */
export function DunningButton({ invoiceId, level }: { invoiceId: string; level: number }) {
  const t = useTranslations("accounting.dunning");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="flat"
      color={level >= 2 ? "danger" : "warning"}
      startContent={<MailWarning className="h-4 w-4" aria-hidden />}
      isLoading={busy}
      onPress={async () => {
        setBusy(true);
        const result = await createDunningAction({ id: invoiceId });
        setBusy(false);
        if (!result.ok) {
          addToast({ title: result.error, color: "danger" });
          return;
        }
        addToast({ title: t("created", { level: t(`levels.${result.data.level}`) }), color: "success" });
        window.open(`/api/accounting/dunnings/${result.data.id}/pdf`, "_blank", "noopener");
        router.refresh();
      }}
    >
      {t(`create.${level}`)}
    </Button>
  );
}
