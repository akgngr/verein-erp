"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Card, Input, Label, Select, Separator, Spinner, Switch, TextField } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { saveTaxSettingsAction } from "../actions/settings-actions";
import type { TaxSettings } from "../services/tax";

const CHARTS = ["SKR03", "SKR04"] as const;
const METHODS = ["IST", "SOLL"] as const;
const PERIODS = ["MONTH", "QUARTER", "YEAR"] as const;

/**
 * Vergi ayarları (ACC-1): hesap planı (SKR03/04), Kleinunternehmer (§ 19 UStG),
 * Ist/Soll-Versteuerung ve UStVA dönemi. § 19 açıkken tüm yeni fişler %0 KDV ile yazılır.
 */
export function TaxSettingsCard({
  settings,
  canUpdate,
}: {
  settings: TaxSettings;
  canUpdate: boolean;
}) {
  const t = useTranslations("accounting.setup.tax");
  const router = useRouter();
  const [value, setValue] = useState<TaxSettings>(settings);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveTaxSettingsAction(value);
      if (!result.ok) {
        notify.error(result.error);
        return;
      }
      notify.success(t("saved"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const pick =
    <K extends keyof TaxSettings>(key: K) =>
    (next: string | number | null) => {
      if (next)
        setValue((current) => ({
          ...current,
          [key]: String(next) as TaxSettings[K],
        }));
    };

  return (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Content className={["gap-4 p-6"].filter(Boolean).join(" ")}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            {t("title")}
          </h2>
          <p className="text-xs text-ink-500">{t("hint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            id="accounting-tax-chart"
            isDisabled={!canUpdate}
            value={value.chartOfAccounts}
            onChange={(selectedValue) => pick("chartOfAccounts")(selectedValue)}
          >
            <Label>{t("chart")}</Label>
                {CHARTS.map((chart) => (
                  <Select.Item
                    key={chart}
                    id={chart}
                    textValue={String(chart)}
                  >
                    <Label>{chart}</Label>
                  </Select.Item>
                ))}
          </Select>
          <Select
            id="accounting-tax-method"
            isDisabled={!canUpdate}
            value={value.taxMethod}
            onChange={(selectedValue) => pick("taxMethod")(selectedValue)}
          >
            <Label>{t("method")}</Label>
                {METHODS.map((method) => (
                  <Select.Item
                    key={method}
                    id={method}
                    textValue={String(t(`method${method}`))}
                  >
                    <Label>{t(`method${method}`)}</Label>
                  </Select.Item>
                ))}
          </Select>
          <Select
            id="accounting-tax-period"
            isDisabled={!canUpdate}
            value={value.vatPeriod}
            onChange={(selectedValue) => pick("vatPeriod")(selectedValue)}
          >
            <Label>{t("period")}</Label>
                {PERIODS.map((period) => (
                  <Select.Item
                    key={period}
                    id={period}
                    textValue={String(t(`period${period}`))}
                  >
                    <Label>{t(`period${period}`)}</Label>
                  </Select.Item>
                ))}
          </Select>
        </div>
        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-xs text-ink-500">
          <li>{t("chartHint")}</li>
          <li>{t("methodHint")}</li>
        </ul>
        <Switch
          id="accounting-tax-smallBusiness"
          isDisabled={!canUpdate}
          isSelected={value.smallBusiness}
          onChange={(smallBusiness) =>
            setValue((current) => ({ ...current, smallBusiness }))
          }
        >
            <Label>
              <div className="flex flex-col">
                <span className="text-sm">{t("smallBusiness")}</span>
                <span className="text-xs text-ink-500">
                  {t("smallBusinessHint")}
                </span>
              </div>
            </Label>
        </Switch>
        <Switch
          id="accounting-tax-extension"
          isDisabled={!canUpdate}
          isSelected={value.vatExtension}
          onChange={(vatExtension) =>
            setValue((current) => ({ ...current, vatExtension }))
          }
        >
            <Label>
              <div className="flex flex-col">
                <span className="text-sm">{t("vatExtension")}</span>
                <span className="text-xs text-ink-500">
                  {t("vatExtensionHint")}
                </span>
              </div>
            </Label>
        </Switch>
        <Separator></Separator>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{t("datevTitle")}</h3>
          <p className="text-xs text-ink-500">{t("datevHint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField
            id="accounting-tax-consultant"
            isDisabled={!canUpdate}
            value={value.datevConsultantNo}
            onChange={(datevConsultantNo) =>
              setValue((current) => ({ ...current, datevConsultantNo }))
            }
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("consultantNo")}</Label>
            <Input inputMode="numeric" maxLength={7} />
          </TextField>
          <TextField
            id="accounting-tax-client"
            isDisabled={!canUpdate}
            value={value.datevClientNo}
            onChange={(datevClientNo) =>
              setValue((current) => ({ ...current, datevClientNo }))
            }
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("clientNo")}</Label>
            <Input inputMode="numeric" maxLength={5} />
          </TextField>
        </div>
        <Switch
          id="accounting-tax-datevKeys"
          isDisabled={!canUpdate}
          isSelected={value.datevTaxKeys}
          onChange={(datevTaxKeys) =>
            setValue((current) => ({ ...current, datevTaxKeys }))
          }
        >
            <Label>
              <div className="flex flex-col">
                <span className="text-sm">{t("datevTaxKeys")}</span>
                <span className="text-xs text-ink-500">
                  {t("datevTaxKeysHint")}
                </span>
              </div>
            </Label>
        </Switch>
        {canUpdate ? (
          <div>
            <Button
              onPress={save}
              variant={actionVariant("primary", "solid")}
              isPending={saving}
            >
              {saving ? <Spinner size="sm" tone="current" /> : null}
              {t("save")}
            </Button>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
