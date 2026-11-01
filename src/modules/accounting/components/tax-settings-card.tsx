"use client";

import { Button, Card, CardBody, Divider, Input, Select, SelectItem, Switch, addToast } from "@heroui/react";
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
export function TaxSettingsCard({ settings, canUpdate }: { settings: TaxSettings; canUpdate: boolean }) {
  const t = useTranslations("accounting.setup.tax");
  const router = useRouter();
  const [value, setValue] = useState<TaxSettings>(settings);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const result = await saveTaxSettingsAction(value);
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("saved"), color: "success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const pick = <K extends keyof TaxSettings>(key: K) => (keys: "all" | Set<React.Key>) => {
    const next = keys === "all" ? undefined : Array.from(keys)[0];
    if (next) setValue((current) => ({ ...current, [key]: String(next) as TaxSettings[K] }));
  };

  return (
    <Card shadow="sm">
      <CardBody className="gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">{t("title")}</h2>
          <p className="text-tiny text-default-500">{t("hint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select id="accounting-tax-chart" label={t("chart")} labelPlacement="outside" isDisabled={!canUpdate} selectedKeys={[value.chartOfAccounts]} onSelectionChange={pick("chartOfAccounts")}>
            {CHARTS.map((chart) => (
              <SelectItem key={chart}>{chart}</SelectItem>
            ))}
          </Select>
          <Select id="accounting-tax-method" label={t("method")} labelPlacement="outside" isDisabled={!canUpdate} selectedKeys={[value.taxMethod]} onSelectionChange={pick("taxMethod")}>
            {METHODS.map((method) => (
              <SelectItem key={method}>{t(`method${method}`)}</SelectItem>
            ))}
          </Select>
          <Select id="accounting-tax-period" label={t("period")} labelPlacement="outside" isDisabled={!canUpdate} selectedKeys={[value.vatPeriod]} onSelectionChange={pick("vatPeriod")}>
            {PERIODS.map((period) => (
              <SelectItem key={period}>{t(`period${period}`)}</SelectItem>
            ))}
          </Select>
        </div>
        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-tiny text-default-500">
          <li>{t("chartHint")}</li>
          <li>{t("methodHint")}</li>
        </ul>
        <Switch id="accounting-tax-smallBusiness" isDisabled={!canUpdate} isSelected={value.smallBusiness} onValueChange={(smallBusiness) => setValue((current) => ({ ...current, smallBusiness }))}>
          <div className="flex flex-col">
            <span className="text-small">{t("smallBusiness")}</span>
            <span className="text-tiny text-default-500">{t("smallBusinessHint")}</span>
          </div>
        </Switch>
        <Divider />
        <div className="flex flex-col gap-1">
          <h3 className="text-small font-semibold">{t("datevTitle")}</h3>
          <p className="text-tiny text-default-500">{t("datevHint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input id="accounting-tax-consultant" label={t("consultantNo")} labelPlacement="outside" inputMode="numeric" maxLength={7} isDisabled={!canUpdate} value={value.datevConsultantNo} onValueChange={(datevConsultantNo) => setValue((current) => ({ ...current, datevConsultantNo }))} />
          <Input id="accounting-tax-client" label={t("clientNo")} labelPlacement="outside" inputMode="numeric" maxLength={5} isDisabled={!canUpdate} value={value.datevClientNo} onValueChange={(datevClientNo) => setValue((current) => ({ ...current, datevClientNo }))} />
        </div>
        <Switch id="accounting-tax-datevKeys" isDisabled={!canUpdate} isSelected={value.datevTaxKeys} onValueChange={(datevTaxKeys) => setValue((current) => ({ ...current, datevTaxKeys }))}>
          <div className="flex flex-col">
            <span className="text-small">{t("datevTaxKeys")}</span>
            <span className="text-tiny text-default-500">{t("datevTaxKeysHint")}</span>
          </div>
        </Switch>
        {canUpdate ? (
          <div>
            <Button color="primary" onPress={save} isLoading={saving}>
              {t("save")}
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
