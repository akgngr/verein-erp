"use client";

import { ClipboardPlus, Power } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Input } from "@/shared/components/kit";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { createComplianceTaskAction, setComplianceRuleStateAction } from "../actions/rules";

type Props =
  | { mode: "task"; ruleId: string; period: number; refKey: string; locale: "tr" | "de" }
  | { mode: "toggle"; ruleId: string; disabled: boolean };

/** Finding actions: draft task (human-confirmed) or admin disable/enable with an audited reason. */
export function ComplianceRowActions(props: Props) {
  const t = useTranslations("compliance");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");

  if (props.mode === "task") {
    return (
      <ActionButton size="sm" emphasis="medium" pending={pending} icon={<ClipboardPlus size={14} />} onClick={() => start(async () => {
        const result = await createComplianceTaskAction({ ruleId: props.ruleId, period: props.period, refKey: props.refKey, locale: props.locale });
        notify(result.ok ? t("taskCreated") : translate(result.error), result.ok ? "success" : "danger");
      })}>
        {t("createTask")}
      </ActionButton>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input aria-label={t("reasonLabel")} placeholder={t("reasonLabel")} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="max-w-sm" />
      <ActionButton size="sm" emphasis="low" tone={props.disabled ? "primary" : "danger"} pending={pending} disabled={reason.trim().length < 3} icon={<Power size={14} />} onClick={() => start(async () => {
        const result = await setComplianceRuleStateAction({ ruleId: props.ruleId, disabled: !props.disabled, reason });
        if (!result.ok) return void notify(translate(result.error), "danger");
        setReason("");
        router.refresh();
      })}>
        {props.disabled ? t("enableRule") : t("disableRule")}
      </ActionButton>
    </div>
  );
}
