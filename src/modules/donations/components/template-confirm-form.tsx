"use client";

import { Button, Checkbox, addToast } from "@heroui/react";
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
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("toastConfirmed"), color: "success" });
      setChecked(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Checkbox isSelected={checked} onValueChange={setChecked} size="sm">
        <span className="text-small">{t("confirmLabel")}</span>
      </Checkbox>
      <div>
        <Button color="primary" size="sm" isDisabled={!checked} isLoading={busy} onPress={confirm}>
          {t("confirmButton")}
        </Button>
      </div>
    </div>
  );
}
