"use client";
import { toast, Button, Spinner } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  acceptAiConsentAction,
  revokeAiConsentAction,
} from "../actions/consent-actions";
import { deleteAllAiConversationsAction } from "../actions/history-actions";

/** Kullanıcının kendi rızasını verme / geri alma düğmesi. */
export function ConsentToggle({ consented }: { consented: boolean }) {
  const t = useTranslations("ai.settings");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {consented ? (
        <Button
          size="sm"
          onPress={async () => {
            setBusy(true);
            const result = await deleteAllAiConversationsAction();
            setBusy(false);
            if (!result.ok)
              return void toast(result.error, { variant: "danger" });
            toast(t("historyDeleted", { count: result.data.count }), {
              variant: "success",
            });
          }}
          variant={actionVariant("default", "flat")}
          isPending={busy}
        >
          {busy ? <Spinner size="sm" color="current" /> : null}
          {t("deleteHistory")}
        </Button>
      ) : null}
      <Button
        size="sm"
        onPress={async () => {
          setBusy(true);
          const result = consented
            ? await revokeAiConsentAction()
            : await acceptAiConsentAction();
          setBusy(false);
          if (!result.ok)
            return void toast(result.error, { variant: "danger" });
          toast(consented ? t("revoked") : t("accepted"), {
            variant: "success",
          });
          router.refresh();
        }}
        variant={actionVariant(
          consented ? "danger" : "primary",
          consented ? "flat" : "solid",
        )}
        isPending={busy}
      >
        {busy ? <Spinner size="sm" color="current" /> : null}
        {consented ? t("revoke") : t("accept")}
      </Button>
    </div>
  );
}
