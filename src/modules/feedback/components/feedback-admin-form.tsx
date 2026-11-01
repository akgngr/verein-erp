"use client";

import { addToast, Button, Select, SelectItem, Textarea } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { updateFeedbackAction } from "../actions/feedback-actions";

const key = (keys: unknown) => (typeof keys === "string" ? keys : String(Array.from(keys as Iterable<unknown>)[0] ?? ""));

/** Yönetici: durum, öncelik ve testçiye cevap. */
export function FeedbackAdminForm({ item }: { item: { id: string; status: string; priority: string; adminReply: string | null } }) {
  const t = useTranslations("feedback");
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [priority, setPriority] = useState(item.priority);
  const [reply, setReply] = useState(item.adminReply ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Select label={t("fields.status")} labelPlacement="outside" selectedKeys={[status]} onSelectionChange={(keys) => setStatus(key(keys) || status)}>
          {["NEW", "IN_PROGRESS", "DONE", "REJECTED"].map((value) => <SelectItem key={value}>{t(`status.${value}`)}</SelectItem>)}
        </Select>
        <Select label={t("fields.priority")} labelPlacement="outside" selectedKeys={[priority]} onSelectionChange={(keys) => setPriority(key(keys) || priority)}>
          {["LOW", "NORMAL", "HIGH"].map((value) => <SelectItem key={value}>{t(`priority.${value}`)}</SelectItem>)}
        </Select>
      </div>
      <Textarea label={t("fields.reply")} labelPlacement="outside" value={reply} onValueChange={setReply} minRows={3} />
      <Button
        color="primary"
        className="self-start"
        isLoading={busy}
        onPress={async () => {
          setBusy(true);
          const result = await updateFeedbackAction({ id: item.id, status, priority, reply });
          setBusy(false);
          if (!result.ok) return void addToast({ title: result.error, color: "danger" });
          addToast({ title: t("saved"), color: "success" });
          router.refresh();
        }}
      >
        {t("save")}
      </Button>
    </div>
  );
}
