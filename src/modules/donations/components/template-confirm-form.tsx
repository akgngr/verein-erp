"use client";
import { toast, Button, Spinner, Checkbox, Label } from "@heroui/react";

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
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(t("toastConfirmed"), { variant: "success" });
      setChecked(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Checkbox isSelected={checked} onChange={setChecked}>
        <Checkbox.Content>
          <Checkbox.Control className="size-4">
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Label>
            <span className="text-sm">{t("confirmLabel")}</span>
          </Label>
        </Checkbox.Content>
      </Checkbox>
      <div>
        <Button
          size="sm"
          isDisabled={!checked}
          onPress={confirm}
          variant={actionVariant("primary", "solid")}
          isPending={busy}
        >
          {busy ? <Spinner size="sm" color="current" /> : null}
          {t("confirmButton")}
        </Button>
      </div>
    </div>
  );
}
