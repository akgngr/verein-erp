"use client";

import { addToast, Button, Checkbox, CheckboxGroup, Input, Textarea } from "@heroui/react";
import { Send, TestTube2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { previewMailingAction, sendMailingTestAction, startMailingAction } from "../actions/mailing-actions";
import { MAILING_PLACEHOLDERS } from "../services/bulk-mail-template";

const STATUSES = ["ACTIVE", "PASSIVE", "RESIGNED", "DECEASED"] as const;
const TYPES = ["ASIL", "ONURSAL", "FAHRI", "DESTEKCI"] as const;
type Preview = { matched: number; eligible: number; noEmail: number; optOut: number };

/** Toplu e-posta oluşturma: filtre, yer tutuculu metin, alıcı özeti, test ve gönderim. */
export function MailingComposer({ defaultBody }: { defaultBody: string }) {
  const t = useTranslations("members");
  const router = useRouter();
  const [statuses, setStatuses] = useState<string[]>(["ACTIVE"]);
  const [types, setTypes] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(defaultBody);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"test" | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void previewMailingAction({ statuses, types }).then((response) => {
      if (!cancelled && response.ok) setPreview(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [statuses, types]);

  const payload = () => ({ statuses, types, subject, body });

  return (
    <section className="flex flex-col gap-4 rounded-large border border-default-200 bg-content1 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CheckboxGroup label={t("mailing.statuses")} orientation="horizontal" value={statuses} onValueChange={setStatuses}>
          {STATUSES.map((value) => (
            <Checkbox key={value} value={value}>
              {t(`status.${value}`)}
            </Checkbox>
          ))}
        </CheckboxGroup>
        <CheckboxGroup label={t("mailing.types")} description={t("mailing.typesHelp")} orientation="horizontal" value={types} onValueChange={setTypes}>
          {TYPES.map((value) => (
            <Checkbox key={value} value={value}>
              {t(`type.${value}`)}
            </Checkbox>
          ))}
        </CheckboxGroup>
      </div>
      {preview ? (
        <p className="rounded-medium bg-default-100 p-3 text-small">
          {t("mailing.preview", { eligible: preview.eligible, matched: preview.matched, noEmail: preview.noEmail, optOut: preview.optOut })}
        </p>
      ) : null}
      <Input label={t("mailing.subject")} labelPlacement="outside" value={subject} onValueChange={setSubject} isRequired />
      <Textarea label={t("mailing.body")} labelPlacement="outside" minRows={10} value={body} onValueChange={setBody} isRequired />
      <div className="flex flex-wrap items-center gap-2 text-tiny text-default-500">
        <span>{t("mailing.placeholders")}</span>
        {MAILING_PLACEHOLDERS.map((key) => (
          <button key={key} type="button" className="rounded-medium bg-default-100 px-2 py-0.5 font-mono hover:bg-default-200" onClick={() => setBody((current) => `${current}{${key}}`)}>
            {`{${key}}`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="flat"
          startContent={<TestTube2 size={16} />}
          isLoading={busy === "test"}
          onPress={async () => {
            setBusy("test");
            const response = await sendMailingTestAction(payload());
            setBusy(null);
            addToast(response.ok ? { title: t("mailing.testSent", { to: response.data.to }), color: "success" } : { title: response.error, color: "danger" });
          }}
        >
          {t("mailing.test")}
        </Button>
        <Button color="primary" startContent={<Send size={16} />} isDisabled={!preview?.eligible || !subject.trim()} onPress={() => setConfirm(true)}>
          {t("mailing.send", { count: preview?.eligible ?? 0 })}
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={t("mailing.confirmTitle")}
        message={t("mailing.confirmText", { count: preview?.eligible ?? 0 })}
        onConfirm={async () => {
          const response = await startMailingAction(payload());
          if (!response.ok) return void addToast({ title: response.error, color: "danger" });
          addToast({ title: t("mailing.started", { count: response.data.recipients }), color: "success" });
          setSubject("");
          setBody(defaultBody);
          router.refresh();
        }}
      />
    </section>
  );
}
