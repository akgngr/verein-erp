"use client";
import { Button, toast } from "@heroui/react";
import { Description, Label, Radio, RadioGroup, Spinner, StatusChip, Switch } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { setAiCloudPolicyAction } from "../actions/consent-actions";

type Mode = "OFF" | "INTENTS" | "SCREENED";

/** Bulut veri politikası: OFF / INTENTS / SCREENED + takma adlı kayıtlar (yerel sağlayıcıyı etkilemez). */
export function CloudPolicyCard({
  settings,
  canChange,
}: {
  settings: { textMode: Mode; pseudonymousRecords: boolean };
  canChange: boolean;
}) {
  const t = useTranslations("ai.cloudPolicy");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(settings.textMode);
  const [records, setRecords] = useState(settings.pseudonymousRecords);
  const [busy, setBusy] = useState(false);
  const changed =
    mode !== settings.textMode || records !== settings.pseudonymousRecords;

  const save = async () => {
    setBusy(true);
    const result = await setAiCloudPolicyAction({
      textMode: mode,
      pseudonymousRecords: mode === "SCREENED" && records,
    });
    setBusy(false);
    if (!result.ok)
      return void toast(translate(result.error), { variant: "danger" });
    toast(t("saved"), { variant: "success" });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-ink-200 bg-surface p-4">
      <RadioGroup
        aria-label={t("modeLabel")}
        value={mode}
        isDisabled={!canChange}
        onChange={(value) => setMode(value as Mode)}
      >
        <div className="flex flex-col gap-2">
          {(["OFF", "INTENTS", "SCREENED"] as const).map((value) => (
            <Radio key={value} value={value}>
                <Label>
                  <span className="flex items-center gap-2">
                    {t(`modes.${value}.label`)}
                    {value === "INTENTS" ? (
                      <StatusChip>
                        {t("default")}
                      </StatusChip>
                    ) : null}
                  </span>
                </Label>
              <Description>{t(`modes.${value}.help`)}</Description>
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <div className="flex flex-col gap-1 border-t border-ink-200 pt-3">
        <Switch
          isSelected={records && mode === "SCREENED"}
          isDisabled={!canChange || mode !== "SCREENED"}
          onChange={setRecords}
          size={"sm"}
        >
            <Label>
              <span className="flex items-center gap-2 text-sm">
                {t("records.label")}
              </span>
            </Label>
        </Switch>
        <p className="text-xs text-ink-500">{t("records.help")}</p>
      </div>
      <p className="rounded-lg bg-warning-50 p-3 text-xs text-warning-800">
        {t("legal")}
      </p>
      {canChange ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            isDisabled={!changed}
            onPress={save}
            variant={actionVariant("primary", "solid")}
            isPending={busy}
          >
            {busy ? <Spinner size="sm" tone="current" /> : null}
            {t("save")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
