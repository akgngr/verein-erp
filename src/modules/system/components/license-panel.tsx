"use client";

import { KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Label, TextArea, TextField } from "@/shared/components/kit";
import { ActionButton } from "@/shared/components/ui/action-button";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { removeLicenseAction, saveLicenseAction } from "../actions/license-actions";

/** Lisans metnini yapıştırma / kaldırma. Durum özeti sunucu görünümünde. */
export function LicensePanel({ hasLicense, canEdit, canRemove }: { hasLicense: boolean; canEdit: boolean; canRemove: boolean }) {
  const t = useTranslations("system.license");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await saveLicenseAction({ text });
      if (!result.ok) return void notify(translate(result.error), "danger");
      notify(t(`saved.${result.data.state}` as never), result.data.state === "valid" ? "success" : "warning");
      setText("");
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      const result = await removeLicenseAction({});
      if (!result.ok) return void notify(translate(result.error), "danger");
      notify(t("removed"), "success");
      router.refresh();
    });

  if (!canEdit) return null;
  return (
    <section className="space-y-3 rounded-xl border border-ink-200 bg-surface p-4">
      <TextField value={text} onChange={setText} className="w-full">
        <Label>{hasLicense ? t("replaceLabel") : t("enterLabel")}</Label>
        <TextArea rows={8} className="font-mono text-xs" placeholder='{"format":"vlic-1", …}' />
      </TextField>
      <p className="text-xs text-ink-500">{t("enterHelp")}</p>
      <div className="flex flex-wrap gap-2">
        <ActionButton tone="primary" pending={pending} disabled={!text.trim()} icon={<KeyRound size={16} />} onClick={save}>
          {t("save")}
        </ActionButton>
        {hasLicense && canRemove ? (
          <ActionButton tone="danger" emphasis="medium" pending={pending} icon={<Trash2 size={16} />} onClick={remove}>
            {t("remove")}
          </ActionButton>
        ) : null}
      </div>
    </section>
  );
}
