"use client";

import { addToast, Button, Textarea } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { saveOnlineFormTextsAction } from "../actions/online-form-actions";

/** Datenschutz ve fotoğraf izni metinleri: formda ilgili onay kutusunun üstünde gösterilir. */
export function OnlineFormTextsForm({ initial }: { initial: { privacyText: string | null; photoText: string | null } }) {
  const t = useTranslations("online-forms.settings");
  const translate = useTranslateMessage();
  const [privacyText, setPrivacyText] = useState(initial.privacyText ?? "");
  const [photoText, setPhotoText] = useState(initial.photoText ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Textarea label={t("privacyText")} labelPlacement="outside" placeholder={t("privacyPlaceholder")} description={t("privacyHelp")} minRows={8} maxRows={24} value={privacyText} onValueChange={setPrivacyText} />
      <Textarea label={t("photoText")} labelPlacement="outside" placeholder={t("photoPlaceholder")} description={t("photoHelp")} minRows={5} maxRows={16} value={photoText} onValueChange={setPhotoText} />
      <p className="text-tiny text-default-500">{t("versionHint")}</p>
      <Button color="primary" className="self-start" isLoading={pending} onPress={() => start(async () => {
        const response = await saveOnlineFormTextsAction({ privacyText, photoText });
        addToast(response.ok ? { title: t("saved"), color: "success" } : { title: translate(response.error), color: "danger" });
      })}>{t("save")}</Button>
    </div>
  );
}
