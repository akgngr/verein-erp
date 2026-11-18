"use client";

import { notify } from "@/shared/components/ui/notify";
import { Card, Checkbox, Label, Select, Spinner, StatusChip, Switch, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  Briefcase,
  Building2,
  CheckCircle2,
  GraduationCap,
  Laptop,
  Store,
  Users,
} from "lucide-react";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { applySetupAction } from "../actions/setup-actions";

type OrgType =
  "VEREIN" | "KLEINGEWERBE" | "MITTELSTAND" | "FREELANCER" | "NACHHILFE";
type ModuleOption = { key: string; label: string; needsApproval: boolean };
type Result = {
  enabled: string[];
  disabled: string[];
  needsApproval: string[];
  categories: number;
  accounts: number;
};

const ICONS: Record<OrgType, ReactNode> = {
  VEREIN: <Users className="h-6 w-6" aria-hidden />,
  KLEINGEWERBE: <Store className="h-6 w-6" aria-hidden />,
  MITTELSTAND: <Building2 className="h-6 w-6" aria-hidden />,
  FREELANCER: <Laptop className="h-6 w-6" aria-hidden />,
  NACHHILFE: <GraduationCap className="h-6 w-6" aria-hidden />,
};
const DEFAULTS: Record<
  OrgType,
  { smallBusiness: boolean; chart: "SKR03" | "SKR04" }
> = {
  VEREIN: { smallBusiness: false, chart: "SKR03" },
  KLEINGEWERBE: { smallBusiness: true, chart: "SKR03" },
  MITTELSTAND: { smallBusiness: false, chart: "SKR04" },
  FREELANCER: { smallBusiness: false, chart: "SKR03" },
  NACHHILFE: { smallBusiness: true, chart: "SKR03" },
};

/** Kurulum sihirbazı: kurum türü → vergi temel ayarları → modüller → özet ve uygula. */
export function SetupWizard({
  types,
  presets,
  modules,
  initialType,
}: {
  types: OrgType[];
  presets: Record<OrgType, string[]>;
  modules: ModuleOption[];
  initialType: OrgType | null;
}) {
  const t = useTranslations("system.setup");
  const [step, setStep] = useState(0);
  const [type, setType] = useState<OrgType | null>(initialType);
  const [smallBusiness, setSmallBusiness] = useState(
    initialType ? DEFAULTS[initialType].smallBusiness : false,
  );
  const [chart, setChart] = useState<"SKR03" | "SKR04">(
    initialType ? DEFAULTS[initialType].chart : "SKR03",
  );
  const [accountingPreset, setAccountingPreset] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialType ? presets[initialType] : []),
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const label = (key: string) =>
    modules.find((module) => module.key === key)?.label ?? key;

  const choose = (value: OrgType) => {
    setType(value);
    setSmallBusiness(DEFAULTS[value].smallBusiness);
    setChart(DEFAULTS[value].chart);
    setSelected(new Set(presets[value]));
    setStep(1);
  };

  const apply = async () => {
    if (!type) return;
    setBusy(true);
    const response = await applySetupAction({
      type,
      modules: [...selected],
      smallBusiness,
      chart,
      accountingPreset: accountingPreset && selected.has("accounting"),
    });
    setBusy(false);
    if (!response.ok) return void notify.error(response.error);
    setResult(response.data);
    setStep(4);
  };

  const steps = [
    t("steps.type"),
    t("steps.basics"),
    t("steps.modules"),
    t("steps.summary"),
  ];

  return (
    <div className="flex flex-col gap-5">
      {step < 4 ? (
        <ol className="flex flex-wrap gap-2 text-sm">
          {steps.map((name, index) => (
            <li key={name}>
              <StatusChip tone={index < step
                    ? "success"
                    : index === step
                      ? "primary"
                      : "default"}
              >{`${index + 1}. ${name}`}</StatusChip>
            </li>
          ))}
        </ol>
      ) : null}

      {step === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition hover:border-accent hover:shadow-md ${type === value ? "border-accent bg-brand-50/40" : "border-ink-200 bg-surface"}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-accent">
                {ICONS[value]}
              </span>
              <span className="font-semibold">{t(`types.${value}.title`)}</span>
              <span className="text-sm text-ink-500">
                {t(`types.${value}.description`)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 1 && type ? (
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content className={["gap-4 p-5"].filter(Boolean).join(" ")}>
            <p className="text-sm text-ink-600">{t(`types.${type}.taxHint`)}</p>
            <Switch isSelected={smallBusiness} onChange={setSmallBusiness}>
                <Label>
                  <span className="flex flex-col">
                    <span className="text-sm">{t("smallBusiness")}</span>
                    <span className="text-xs text-ink-500">
                      {t("smallBusinessHint")}
                    </span>
                  </span>
                </Label>
            </Switch>
            <Select
              className="max-w-xs"
              value={chart}
              onChange={(selectedValue) => {
                const keys =
                  selectedValue === null ? undefined : String(selectedValue);
                return setChart(
                  (typeof keys === "string"
                    ? keys
                    : String(keys ?? "SKR03")) as "SKR03" | "SKR04",
                );
              }}
            >
              <Label>{t("chart")}</Label>
                  <Select.Item key="SKR03" id={"SKR03"} textValue={"SKR03"}>
                    <Label>SKR03</Label>
                  </Select.Item>
                  <Select.Item key="SKR04" id={"SKR04"} textValue={"SKR04"}>
                    <Label>SKR04</Label>
                  </Select.Item>
            </Select>
            <p className="-mt-2 text-xs text-ink-500">{t("chartHint")}</p>
            <Checkbox
              isSelected={accountingPreset}
              onChange={setAccountingPreset}
            >
                <Label>
                  <span className="text-sm">{t("accountingPreset")}</span>
                </Label>
            </Checkbox>
            <p className="-mt-2 text-xs text-ink-500">
              {t("accountingPresetHint")}
            </p>
          </Card.Content>
        </Card>
      ) : null}

      {step === 2 && type ? (
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content className={["gap-2 p-5"].filter(Boolean).join(" ")}>
            <p className="text-sm text-ink-600">{t("modulesHint")}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {modules.map((module) => (
                <Checkbox
                  key={module.key}
                  isSelected={selected.has(module.key)}
                  onChange={(on) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (on) next.add(module.key);
                      else next.delete(module.key);
                      return next;
                    })
                  }
                >
                    <Label>
                      <span className="text-sm">
                        {module.label}
                        {module.needsApproval ? (
                          <span className="ml-2 text-xs text-warning-600">
                            {t("needsApproval")}
                          </span>
                        ) : null}
                      </span>
                    </Label>
                </Checkbox>
              ))}
            </div>
          </Card.Content>
        </Card>
      ) : null}

      {step === 3 && type ? (
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content
            className={["gap-2 p-5 text-sm"].filter(Boolean).join(" ")}
          >
            <p>
              <strong>{t("summary.type")}:</strong> {t(`types.${type}.title`)}
            </p>
            <p>
              <strong>{t("summary.tax")}:</strong> {chart} ·{" "}
              {smallBusiness
                ? t("summary.smallBusinessOn")
                : t("summary.smallBusinessOff")}
            </p>
            <p>
              <strong>{t("summary.modules")}:</strong>{" "}
              {[...selected].map(label).join(", ") || "—"}
            </p>
            <p>
              <strong>{t("summary.accounting")}:</strong>{" "}
              {accountingPreset && selected.has("accounting")
                ? t("summary.presetOn")
                : t("summary.presetOff")}
            </p>
            <p className="text-xs text-ink-500">{t("summary.note")}</p>
          </Card.Content>
        </Card>
      ) : null}

      {step === 4 && result ? (
        <Card className={"shadow-sm border border-ink-200/80"}>
          <Card.Content
            className={["gap-3 p-5 text-sm"].filter(Boolean).join(" ")}
          >
            <p className="flex items-center gap-2 font-semibold text-success-700">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              {t("done.title")}
            </p>
            <p>
              {t("done.modules", {
                enabled: result.enabled.map(label).join(", ") || "—",
              })}
            </p>
            {result.needsApproval.length ? (
              <p className="text-warning-700">
                {t("done.needsApproval", {
                  modules: result.needsApproval.map(label).join(", "),
                })}
              </p>
            ) : null}
            {accountingPreset ? (
              <p>
                {t("done.accounting", {
                  categories: result.categories,
                  accounts: result.accounts,
                })}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <ActionLink
                href="/ayarlar/dernek"
                className={buttonClassName({
                  variant: actionVariant("primary", "solid"),
                  size: "sm",
                })}
              >
                {<Briefcase className="h-4 w-4" aria-hidden />}
                {t("done.profile")}
              </ActionLink>
              {selected.has("accounting") ? (
                <ActionLink
                  href="/muhasebe/ayarlar"
                  className={buttonClassName({
                    variant: actionVariant("default", "flat"),
                    size: "sm",
                  })}
                >
                  {t("done.accountingSettings")}
                </ActionLink>
              ) : null}
              {result.needsApproval.length ? (
                <ActionLink
                  href="/ayarlar/moduller"
                  className={buttonClassName({
                    variant: actionVariant("default", "flat"),
                    size: "sm",
                  })}
                >
                  {t("done.modulesPage")}
                </ActionLink>
              ) : null}
              <ActionLink
                href="/"
                className={buttonClassName({
                  variant: actionVariant("default", "light"),
                  size: "sm",
                })}
              >
                {t("done.dashboard")}
              </ActionLink>
            </div>
          </Card.Content>
        </Card>
      ) : null}

      {step > 0 && step < 4 ? (
        <div className="flex gap-2">
          <Button
            onPress={() => setStep(step - 1)}
            variant={actionVariant("default", "flat")}
          >
            {t("back")}
          </Button>
          {step < 3 ? (
            <Button
              onPress={() => setStep(step + 1)}
              variant={actionVariant("primary", "solid")}
            >
              {t("next")}
            </Button>
          ) : (
            <Button
              onPress={apply}
              variant={actionVariant("primary", "solid")}
              isPending={busy}
            >
              {busy ? <Spinner size="sm" tone="current" /> : null}
              {t("apply")}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
