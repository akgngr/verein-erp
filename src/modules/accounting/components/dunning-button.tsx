"use client";
import { toast, Button, Spinner } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { MailWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { createDunningAction } from "../actions/dunning-actions";

/** Sonraki ihtar kademesini oluşturur ve mektubu (PDF) yeni sekmede açar. */
export function DunningButton({
  invoiceId,
  level,
}: {
  invoiceId: string;
  level: number;
}) {
  const t = useTranslations("accounting.dunning");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      onPress={async () => {
        setBusy(true);
        const result = await createDunningAction({ id: invoiceId });
        setBusy(false);
        if (!result.ok) {
          toast(result.error, { variant: "danger" });
          return;
        }
        toast(t("created", { level: t(`levels.${result.data.level}`) }), {
          variant: "success",
        });
        window.open(
          `/api/accounting/dunnings/${result.data.id}/pdf`,
          "_blank",
          "noopener",
        );
        router.refresh();
      }}
      variant={actionVariant(level >= 2 ? "danger" : "warning", "flat")}
      isPending={busy}
    >
      {busy ? <Spinner size="sm" color="current" /> : null}
      {<MailWarning className="h-4 w-4" aria-hidden />}
      {t(`create.${level}`)}
    </Button>
  );
}
