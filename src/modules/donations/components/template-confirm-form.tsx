"use client";

import { notify } from "@/shared/components/ui/notify";
import { Checkbox, Label, Spinner, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { confirmTemplateAction } from "../actions/settings-actions";

/** Şablon metin onayı (§ 14): karşılaştırma onay kutusu + "Metni onayla". */
export function TemplateConfirmForm() {
  const t = useTranslations("donations.settings");
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await confirmTemplateAction();
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(t("toastConfirmed"));
      setChecked(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Checkbox isSelected={checked} onChange={setChecked}>
          <Label>
            <span className="text-sm">{t("confirmLabel")}</span>
          </Label>
      </Checkbox>
      <div>
        <Button
          size="sm"
          isDisabled={!checked}
          onPress={confirm}
          variant={actionVariant("primary", "solid")}
          isPending={busy}
        >
          {busy ? <Spinner size="sm" tone="current" /> : null}
          {t("confirmButton")}
        </Button>
      </div>
    </div>
  );
}
