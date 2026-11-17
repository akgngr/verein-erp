"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";
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
        <ActionButton
          color="default"
          variant="flat"
          isPending={busy}
          onPress={async () => {
            setBusy(true);
            const result = await deleteAllAiConversationsAction();
            setBusy(false);
            if (!result.ok) {
              notify(result.error, "danger");
              return;
            }
            notify(t("historyDeleted", { count: result.data.count }), "success");
          }}
        >
          {t("deleteHistory")}
        </ActionButton>
      ) : null}
      <ActionButton
        color={consented ? "danger" : "primary"}
        variant={consented ? "flat" : "solid"}
        isPending={busy}
        onPress={async () => {
          setBusy(true);
          const result = consented
            ? await revokeAiConsentAction()
            : await acceptAiConsentAction();
          setBusy(false);
          if (!result.ok) {
            notify(result.error, "danger");
            return;
          }
          notify(consented ? t("revoked") : t("accepted"), "success");
          router.refresh();
        }}
      >
        {consented ? t("revoke") : t("accept")}
      </ActionButton>
    </div>
  );
}
