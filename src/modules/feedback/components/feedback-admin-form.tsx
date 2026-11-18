"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Label, Select, Spinner, TextArea, TextField } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { updateFeedbackAction } from "../actions/feedback-actions";

/** Yönetici: durum, öncelik ve testçiye cevap. */
export function FeedbackAdminForm({
  item,
}: {
  item: {
    id: string;
    status: string;
    priority: string;
    adminReply: string | null;
  };
}) {
  const t = useTranslations("feedback");
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [priority, setPriority] = useState(item.priority);
  const [reply, setReply] = useState(item.adminReply ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={status}
          onChange={(selectedValue) => {
            const keys =
              selectedValue === null ? undefined : String(selectedValue);
            return setStatus(String(keys ?? "") || status);
          }}
        >
          <Label>{t("fields.status")}</Label>
              {["NEW", "IN_PROGRESS", "DONE", "REJECTED"].map((value) => (
                <Select.Item
                  key={value}
                  id={value}
                  textValue={String(t(`status.${value}`))}
                >
                  <Label>{t(`status.${value}`)}</Label>
                </Select.Item>
              ))}
        </Select>
        <Select
          value={priority}
          onChange={(selectedValue) => {
            const keys =
              selectedValue === null ? undefined : String(selectedValue);
            return setPriority(String(keys ?? "") || priority);
          }}
        >
          <Label>{t("fields.priority")}</Label>
              {["LOW", "NORMAL", "HIGH"].map((value) => (
                <Select.Item
                  key={value}
                  id={value}
                  textValue={String(t(`priority.${value}`))}
                >
                  <Label>{t(`priority.${value}`)}</Label>
                </Select.Item>
              ))}
        </Select>
      </div>
      <TextField
        value={reply}
        onChange={setReply}
        className={["w-full"].filter(Boolean).join(" ")}
      >
        <Label>{t("fields.reply")}</Label>
        <TextArea
          rows={3}
          className={["[field-sizing:content]"].filter(Boolean).join(" ")}
        />
      </TextField>
      <Button
        className="self-start"
        onPress={async () => {
          setBusy(true);
          const result = await updateFeedbackAction({
            id: item.id,
            status,
            priority,
            reply,
          });
          setBusy(false);
          if (!result.ok)
            return void notify.error(result.error);
          notify.success(t("saved"));
          router.refresh();
        }}
        variant={actionVariant("primary", "solid")}
        isPending={busy}
      >
        {busy ? <Spinner size="sm" tone="current" /> : null}
        {t("save")}
      </Button>
    </div>
  );
}
