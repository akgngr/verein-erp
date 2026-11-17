"use client";
import { Button, toast } from "@heroui/react";
import { Card, Description, FieldError, InputGroup, Label, Select, Spinner, TextField } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { saveEInvoiceSettingsAction } from "../actions/settings-actions";
import type {
  IssuerObligation,
  ReadinessKey,
} from "../services/einvoice-obligation";

const MODES = ["AUTO", "ALWAYS", "NEVER"] as const;

type Status = {
  settings: {
    mode: (typeof MODES)[number];
    previousYearRevenueCents: number | null;
    smallBusiness: boolean;
  };
  thisYear: { year: number; obligation: IssuerObligation };
  nextYear: { year: number; obligation: IssuerObligation };
  readiness: Array<{ key: ReadinessKey; ok: boolean }>;
};

/** EI-4: e-fatura kesme zorunluluğu ayarı + 2027/2028 hazırlık listesi. */
export function EInvoiceObligationCard({
  status,
  canUpdate,
}: {
  status: Status;
  canUpdate: boolean;
}) {
  const t = useTranslations("accounting.einvoice.obligation");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [mode, setMode] = useState(status.settings.mode);
  const [revenue, setRevenue] = useState(
    status.settings.previousYearRevenueCents === null
      ? ""
      : (status.settings.previousYearRevenueCents / 100).toLocaleString(
          "de-DE",
        ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await saveEInvoiceSettingsAction({
        mode,
        previousYearRevenue: revenue,
      });
      if (!result.ok)
        return setError(
          result.fieldErrors?.previousYearRevenue?.[0] ?? result.error,
        );
      toast(t("saved"), { variant: "success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const line = (entry: { year: number; obligation: IssuerObligation }) => (
    <li
      className={`flex items-start gap-2 ${entry.obligation.required ? "text-warning-700" : "text-ink-600"}`}
    >
      <span className="font-semibold tabular-nums">{entry.year}:</span>
      <span>
        {entry.obligation.required ? t("required") : t("notRequired")} —{" "}
        {t(`reasons.${entry.obligation.reason}`)}
      </span>
    </li>
  );

  return (
    <Card
      className={["mt-4", "shadow-sm border border-ink-200/80"]
        .filter(Boolean)
        .join(" ")}
    >
      <Card.Content className={["gap-4 p-6"].filter(Boolean).join(" ")}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            {t("title")}
          </h2>
          <p className="text-xs text-ink-500">{t("hint")}</p>
        </div>
        <ul className="flex flex-col gap-1 rounded-lg bg-ink-50 p-3 text-sm">
          {line(status.thisYear)}
          {line(status.nextYear)}
        </ul>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            id="accounting-einvoice-mode"
            isDisabled={!canUpdate}
            value={mode}
            onChange={(selectedValue) => {
              const keys =
                selectedValue === null ? undefined : String(selectedValue);
              const next = keys;
              if (next) setMode(String(next) as (typeof MODES)[number]);
            }}
          >
            <Label>{t("mode")}</Label>
                {MODES.map((value) => (
                  <Select.Item
                    key={value}
                    id={value}
                    textValue={String(t(`modes.${value}`))}
                  >
                    <Label>{t(`modes.${value}`)}</Label>
                  </Select.Item>
                ))}
          </Select>
          <TextField
            isDisabled={!canUpdate}
            value={revenue}
            isInvalid={Boolean(error)}
            onChange={setRevenue}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <Label>{t("revenue")}</Label>
            <InputGroup>
              <InputGroup.Input placeholder="850.000" />
              <InputGroup.Suffix>
                {<span className="text-sm text-ink-400">€</span>}
              </InputGroup.Suffix>
            </InputGroup>
            <Description>{t("revenueHint")}</Description>
            <FieldError>{error ? translate(error) : undefined}</FieldError>
          </TextField>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">{t("readinessTitle")}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {status.readiness.map((check) => (
              <li
                key={check.key}
                className={`flex items-center gap-2 ${check.ok ? "text-success-700" : "text-warning-700"}`}
              >
                {check.ok ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                ) : (
                  <XCircle className="h-4 w-4" aria-hidden />
                )}
                {t(`readiness.${check.key}`)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500">{t("readinessHint")}</p>
        </div>
        {canUpdate ? (
          <div className="flex justify-end">
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
