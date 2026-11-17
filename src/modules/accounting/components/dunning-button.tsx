"use client";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";

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
    <ActionButton
      color={level >= 2 ? "danger" : "warning"}
      variant="flat"
      isPending={busy}
      startIcon={<MailWarning className="h-4 w-4" aria-hidden />}
      onPress={async () => {
        setBusy(true);
        const result = await createDunningAction({ id: invoiceId });
        setBusy(false);
        if (!result.ok) {
          notify(result.error, "danger");
          return;
        }
        notify(t("created", { level: t(`levels.${result.data.level}`) }), "success");
        window.open(
          `/api/accounting/dunnings/${result.data.id}/pdf`,
          "_blank",
          "noopener",
        );
        router.refresh();
      }}
    >
      {t(`create.${level}`)}
    </ActionButton>
  );
}
