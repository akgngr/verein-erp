"use client";

import { useTranslations } from "next-intl";

import { Button, Textarea, addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateAgendaDiscussionAction } from "../actions/agenda-actions";

/**
 * Görüşme editörü (7.3 Gündem): textarea + açık Kaydet düğmesi; kilitliyken
 * kayıtlı metin salt okunur gösterilir. Metin whitespace-pre-wrap ile
 * oluğuz yazılır, HTML olarak ASLA (5. bölüm md. 12).
 */
export function DiscussionEditor({
  itemId,
  initialDiscussion,
  editable,
}: {
  itemId: string;
  initialDiscussion: string | null;
  editable: boolean;
}) {
  const t = useTranslations("meetings.discussion");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialDiscussion ?? "");
  const [busy, setBusy] = useState(false);

  if (!editable) {
    if (!initialDiscussion) return null;
    return (
      <div className="mt-2">
        <p className="text-tiny font-medium text-default-500">{t("label")}</p>
        <p className="whitespace-pre-wrap text-small">{initialDiscussion}</p>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <p className="text-tiny font-medium text-default-500">{t("label")}</p>
        {initialDiscussion ? (
          <p className="whitespace-pre-wrap text-small">{initialDiscussion}</p>
        ) : (
          <p className="text-small text-default-400">{t("emptyNote")}</p>
        )}
        <Button
          size="sm"
          variant="light"
          className="mt-1"
          onPress={() => {
            setValue(initialDiscussion ?? "");
            setEditing(true);
          }}
        >
          {initialDiscussion ? t("edit") : t("add")}
        </Button>
      </div>
    );
  }

  const save = async () => {
    setBusy(true);
    const result = await updateAgendaDiscussionAction({
      id: itemId,
      discussion: value,
    });
    setBusy(false);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("savedToast"), color: "success" });
    setEditing(false);
    router.refresh();
  };

  return (
    <div className="mt-2">
      <Textarea
        label={t("fieldLabel")}
        labelPlacement="outside"
        value={value}
        onValueChange={setValue}
        minRows={4}
        maxLength={10000}
        description={t("fieldHelp")}
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" color="primary" isLoading={busy} onPress={save}>
          {t("save")}
        </Button>
        <Button size="sm" variant="light" onPress={() => setEditing(false)}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
