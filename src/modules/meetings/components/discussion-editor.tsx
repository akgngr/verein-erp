"use client";
import {
  toast,
  Button,
  Spinner,
  TextField,
  Label,
  TextArea,
  Description,
} from "@heroui/react";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

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
        <p className="text-xs font-medium text-ink-500">{t("label")}</p>
        <p className="whitespace-pre-wrap text-sm">{initialDiscussion}</p>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <p className="text-xs font-medium text-ink-500">{t("label")}</p>
        {initialDiscussion ? (
          <p className="whitespace-pre-wrap text-sm">{initialDiscussion}</p>
        ) : (
          <p className="text-sm text-ink-400">{t("emptyNote")}</p>
        )}
        <Button
          size="sm"
          className="mt-1"
          onPress={() => {
            setValue(initialDiscussion ?? "");
            setEditing(true);
          }}
          variant={actionVariant("default", "light")}
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
      toast(result.error, { variant: "danger" });
      return;
    }
    toast(t("savedToast"), { variant: "success" });
    setEditing(false);
    router.refresh();
  };

  return (
    <div className="mt-2">
      <TextField
        value={value}
        onChange={setValue}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("fieldLabel")}</Label>
        <TextArea
          maxLength={10000}
          rows={4}
          className={["[field-sizing:content]"].filter(Boolean).join(" ")}
        />
        <Description>{t("fieldHelp")}</Description>
      </TextField>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          onPress={save}
          variant={actionVariant("primary", "solid")}
          isPending={busy}
        >
          {busy ? <Spinner size="sm" color="current" /> : null}
          {t("save")}
        </Button>
        <Button
          size="sm"
          onPress={() => setEditing(false)}
          variant={actionVariant("default", "light")}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
