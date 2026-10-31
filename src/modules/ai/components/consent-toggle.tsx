"use client";

import { addToast, Button } from "@heroui/react";
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
          variant="flat"
          isLoading={busy}
          onPress={async () => {
            setBusy(true);
            const result = await deleteAllAiConversationsAction();
            setBusy(false);
            if (!result.ok)
              return void addToast({ title: result.error, color: "danger" });
            addToast({
              title: t("historyDeleted", { count: result.data.count }),
              color: "success",
            });
          }}
        >
          {t("deleteHistory")}
        </Button>
      ) : null}
      <Button
        size="sm"
        color={consented ? "danger" : "primary"}
        variant={consented ? "flat" : "solid"}
        isLoading={busy}
        onPress={async () => {
          setBusy(true);
          const result = consented
            ? await revokeAiConsentAction()
            : await acceptAiConsentAction();
          setBusy(false);
          if (!result.ok)
            return void addToast({ title: result.error, color: "danger" });
          addToast({
            title: consented ? t("revoked") : t("accepted"),
            color: "success",
          });
          router.refresh();
        }}
      >
        {consented ? t("revoke") : t("accept")}
      </Button>
    </div>
  );
}
