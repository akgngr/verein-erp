"use client";

import { addToast, Button, Card, CardBody, Checkbox, Chip, Select, SelectItem, Switch } from "@heroui/react";
import { Briefcase, Building2, CheckCircle2, GraduationCap, Laptop, Store, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { applySetupAction } from "../actions/setup-actions";

type OrgType = "VEREIN" | "KLEINGEWERBE" | "MITTELSTAND" | "FREELANCER" | "NACHHILFE";
type ModuleOption = { key: string; label: string; needsApproval: boolean };
type Result = { enabled: string[]; disabled: string[]; needsApproval: string[]; categories: number; accounts: number };

const ICONS: Record<OrgType, ReactNode> = {
  VEREIN: <Users className="h-6 w-6" aria-hidden />,
  KLEINGEWERBE: <Store className="h-6 w-6" aria-hidden />,
  MITTELSTAND: <Building2 className="h-6 w-6" aria-hidden />,
  FREELANCER: <Laptop className="h-6 w-6" aria-hidden />,
  NACHHILFE: <GraduationCap className="h-6 w-6" aria-hidden />,
};
const DEFAULTS: Record<OrgType, { smallBusiness: boolean; chart: "SKR03" | "SKR04" }> = {
  VEREIN: { smallBusiness: false, chart: "SKR03" },
  KLEINGEWERBE: { smallBusiness: true, chart: "SKR03" },
  MITTELSTAND: { smallBusiness: false, chart: "SKR04" },
  FREELANCER: { smallBusiness: false, chart: "SKR03" },
  NACHHILFE: { smallBusiness: true, chart: "SKR03" },
};

/** Kurulum sihirbazı: kurum türü → vergi temel ayarları → modüller → özet ve uygula. */
export function SetupWizard({ types, presets, modules, initialType }: { types: OrgType[]; presets: Record<OrgType, string[]>; modules: ModuleOption[]; initialType: OrgType | null }) {
  const t = useTranslations("system.setup");
  const [step, setStep] = useState(0);
  const [type, setType] = useState<OrgType | null>(initialType);
  const [smallBusiness, setSmallBusiness] = useState(initialType ? DEFAULTS[initialType].smallBusiness : false);
  const [chart, setChart] = useState<"SKR03" | "SKR04">(initialType ? DEFAULTS[initialType].chart : "SKR03");
  const [accountingPreset, setAccountingPreset] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialType ? presets[initialType] : []));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const label = (key: string) => modules.find((module) => module.key === key)?.label ?? key;

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
    const response = await applySetupAction({ type, modules: [...selected], smallBusiness, chart, accountingPreset: accountingPreset && selected.has("accounting") });
    setBusy(false);
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    setResult(response.data);
    setStep(4);
  };

  const steps = [t("steps.type"), t("steps.basics"), t("steps.modules"), t("steps.summary")];

  return (
    <div className="flex flex-col gap-5">
      {step < 4 ? (
        <ol className="flex flex-wrap gap-2 text-small">
          {steps.map((name, index) => (
            <li key={name}>
              <Chip size="sm" variant={index === step ? "solid" : "flat"} color={index < step ? "success" : index === step ? "primary" : "default"}>{`${index + 1}. ${name}`}</Chip>
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
              className={`flex flex-col gap-2 rounded-large border p-4 text-left transition hover:border-primary hover:shadow-medium ${type === value ? "border-primary bg-primary-50/40" : "border-default-200 bg-content1"}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-medium bg-primary-50 text-primary">{ICONS[value]}</span>
              <span className="font-semibold">{t(`types.${value}.title`)}</span>
              <span className="text-small text-default-500">{t(`types.${value}.description`)}</span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 1 && type ? (
        <Card shadow="sm">
          <CardBody className="gap-4 p-5">
            <p className="text-small text-default-600">{t(`types.${type}.taxHint`)}</p>
            <Switch isSelected={smallBusiness} onValueChange={setSmallBusiness}>
              <span className="flex flex-col">
                <span className="text-small">{t("smallBusiness")}</span>
                <span className="text-tiny text-default-500">{t("smallBusinessHint")}</span>
              </span>
            </Switch>
            <Select label={t("chart")} labelPlacement="outside" selectedKeys={[chart]} onSelectionChange={(keys) => setChart((typeof keys === "string" ? keys : String(Array.from(keys as Set<string>)[0] ?? "SKR03")) as "SKR03" | "SKR04")} className="max-w-xs">
              <SelectItem key="SKR03">SKR03</SelectItem>
              <SelectItem key="SKR04">SKR04</SelectItem>
            </Select>
            <p className="-mt-2 text-tiny text-default-500">{t("chartHint")}</p>
            <Checkbox isSelected={accountingPreset} onValueChange={setAccountingPreset}>
              <span className="text-small">{t("accountingPreset")}</span>
            </Checkbox>
            <p className="-mt-2 text-tiny text-default-500">{t("accountingPresetHint")}</p>
          </CardBody>
        </Card>
      ) : null}

      {step === 2 && type ? (
        <Card shadow="sm">
          <CardBody className="gap-2 p-5">
            <p className="text-small text-default-600">{t("modulesHint")}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {modules.map((module) => (
                <Checkbox
                  key={module.key}
                  isSelected={selected.has(module.key)}
                  onValueChange={(on) => setSelected((current) => {
                    const next = new Set(current);
                    if (on) next.add(module.key);
                    else next.delete(module.key);
                    return next;
                  })}
                >
                  <span className="text-small">
                    {module.label}
                    {module.needsApproval ? <span className="ml-2 text-tiny text-warning-600">{t("needsApproval")}</span> : null}
                  </span>
                </Checkbox>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {step === 3 && type ? (
        <Card shadow="sm">
          <CardBody className="gap-2 p-5 text-small">
            <p><strong>{t("summary.type")}:</strong> {t(`types.${type}.title`)}</p>
            <p><strong>{t("summary.tax")}:</strong> {chart} · {smallBusiness ? t("summary.smallBusinessOn") : t("summary.smallBusinessOff")}</p>
            <p><strong>{t("summary.modules")}:</strong> {[...selected].map(label).join(", ") || "—"}</p>
            <p><strong>{t("summary.accounting")}:</strong> {accountingPreset && selected.has("accounting") ? t("summary.presetOn") : t("summary.presetOff")}</p>
            <p className="text-tiny text-default-500">{t("summary.note")}</p>
          </CardBody>
        </Card>
      ) : null}

      {step === 4 && result ? (
        <Card shadow="sm">
          <CardBody className="gap-3 p-5 text-small">
            <p className="flex items-center gap-2 font-semibold text-success-700"><CheckCircle2 className="h-5 w-5" aria-hidden />{t("done.title")}</p>
            <p>{t("done.modules", { enabled: result.enabled.map(label).join(", ") || "—" })}</p>
            {result.needsApproval.length ? <p className="text-warning-700">{t("done.needsApproval", { modules: result.needsApproval.map(label).join(", ") })}</p> : null}
            {accountingPreset ? <p>{t("done.accounting", { categories: result.categories, accounts: result.accounts })}</p> : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button as={Link} href="/ayarlar/dernek" size="sm" color="primary" startContent={<Briefcase className="h-4 w-4" aria-hidden />}>{t("done.profile")}</Button>
              {selected.has("accounting") ? <Button as={Link} href="/muhasebe/ayarlar" size="sm" variant="flat">{t("done.accountingSettings")}</Button> : null}
              {result.needsApproval.length ? <Button as={Link} href="/ayarlar/moduller" size="sm" variant="flat">{t("done.modulesPage")}</Button> : null}
              <Button as={Link} href="/" size="sm" variant="light">{t("done.dashboard")}</Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {step > 0 && step < 4 ? (
        <div className="flex gap-2">
          <Button variant="flat" onPress={() => setStep(step - 1)}>{t("back")}</Button>
          {step < 3 ? (
            <Button color="primary" onPress={() => setStep(step + 1)}>{t("next")}</Button>
          ) : (
            <Button color="primary" isLoading={busy} onPress={apply}>{t("apply")}</Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
