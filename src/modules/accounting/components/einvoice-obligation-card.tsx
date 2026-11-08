"use client";

import { Button, Card, CardBody, Input, Select, SelectItem, addToast } from "@heroui/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { saveEInvoiceSettingsAction } from "../actions/settings-actions";
import type { IssuerObligation, ReadinessKey } from "../services/einvoice-obligation";

const MODES = ["AUTO", "ALWAYS", "NEVER"] as const;

type Status = {
  settings: { mode: (typeof MODES)[number]; previousYearRevenueCents: number | null; smallBusiness: boolean };
  thisYear: { year: number; obligation: IssuerObligation };
  nextYear: { year: number; obligation: IssuerObligation };
  readiness: Array<{ key: ReadinessKey; ok: boolean }>;
};

/** EI-4: e-fatura kesme zorunluluğu ayarı + 2027/2028 hazırlık listesi. */
export function EInvoiceObligationCard({ status, canUpdate }: { status: Status; canUpdate: boolean }) {
  const t = useTranslations("accounting.einvoice.obligation");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [mode, setMode] = useState(status.settings.mode);
  const [revenue, setRevenue] = useState(status.settings.previousYearRevenueCents === null ? "" : (status.settings.previousYearRevenueCents / 100).toLocaleString("de-DE"));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveEInvoiceSettingsAction({ mode, previousYearRevenue: revenue });
      if (!result.ok) return setError(result.fieldErrors?.previousYearRevenue?.[0] ?? result.error);
      addToast({ title: t("saved"), color: "success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const line = (entry: { year: number; obligation: IssuerObligation }) => (
    <li className={`flex items-start gap-2 ${entry.obligation.required ? "text-warning-700" : "text-default-600"}`}>
      <span className="font-semibold tabular-nums">{entry.year}:</span>
      <span>{entry.obligation.required ? t("required") : t("notRequired")} — {t(`reasons.${entry.obligation.reason}`)}</span>
    </li>
  );

  return (
    <Card shadow="sm" className="mt-4">
      <CardBody className="gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">{t("title")}</h2>
          <p className="text-tiny text-default-500">{t("hint")}</p>
        </div>
        <ul className="flex flex-col gap-1 rounded-medium bg-default-50 p-3 text-small">
          {line(status.thisYear)}
          {line(status.nextYear)}
        </ul>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select id="accounting-einvoice-mode" label={t("mode")} labelPlacement="outside" isDisabled={!canUpdate} selectedKeys={[mode]} onSelectionChange={(keys) => { const next = Array.from(keys)[0]; if (next) setMode(String(next) as (typeof MODES)[number]); }}>
            {MODES.map((value) => <SelectItem key={value}>{t(`modes.${value}`)}</SelectItem>)}
          </Select>
          <Input
            label={t("revenue")}
            labelPlacement="outside"
            placeholder="850.000"
            endContent={<span className="text-small text-default-400">€</span>}
            isDisabled={!canUpdate}
            value={revenue}
            onValueChange={setRevenue}
            description={t("revenueHint")}
            isInvalid={Boolean(error)}
            errorMessage={error ? translate(error) : undefined}
          />
        </div>
        <div>
          <h3 className="mb-1 text-small font-semibold">{t("readinessTitle")}</h3>
          <ul className="flex flex-col gap-1 text-small">
            {status.readiness.map((check) => (
              <li key={check.key} className={`flex items-center gap-2 ${check.ok ? "text-success-700" : "text-warning-700"}`}>
                {check.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />}
                {t(`readiness.${check.key}`)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-tiny text-default-500">{t("readinessHint")}</p>
        </div>
        {canUpdate ? (
          <div className="flex justify-end">
            <Button color="primary" isLoading={saving} onPress={save}>{t("save")}</Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
