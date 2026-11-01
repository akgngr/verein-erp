"use client";

import { addToast, Button, Checkbox, CheckboxGroup, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { Send, TestTube2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { previewMailingAction, sendMailingTestAction, startMailingAction } from "../actions/mailing-actions";

export type ComposerSource = {
  id: string;
  label: string;
  placeholders: string[];
  filters: { key: string; label: string; options: { value: string; label: string }[]; defaults: string[] }[];
};
type Preview = { matched: number; eligible: number; noEmail: number; optOut: number };

const defaultsOf = (source: ComposerSource | undefined) => Object.fromEntries((source?.filters ?? []).map((filter) => [filter.key, filter.defaults]));

/** Kaynak + filtre, yer tutuculu metin, alıcı özeti, test ve gönderim. */
export function MailingComposer({ sources, initialSourceId, defaultBody }: { sources: ComposerSource[]; initialSourceId: string | null; defaultBody: string }) {
  const t = useTranslations("mailings");
  const router = useRouter();
  const [sourceId, setSourceId] = useState(initialSourceId && sources.some((source) => source.id === initialSourceId) ? initialSourceId : (sources[0]?.id ?? ""));
  const source = useMemo(() => sources.find((item) => item.id === sourceId), [sources, sourceId]);
  const [filter, setFilter] = useState<Record<string, string[]>>(() => defaultsOf(source));
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(defaultBody);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!sourceId) return;
    let cancelled = false;
    void previewMailingAction({ sourceId, filter }).then((response) => {
      if (!cancelled) setPreview(response.ok ? response.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [sourceId, filter]);

  if (!sources.length) return <p className="text-small text-default-500">{t("noSources")}</p>;
  const payload = () => ({ sourceId, filter, subject, body });

  return (
    <section className="flex flex-col gap-4 rounded-large border border-default-200 bg-content1 p-4">
      <Select
        label={t("source")}
        labelPlacement="outside"
        selectedKeys={[sourceId]}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0];
          if (typeof key !== "string") return;
          setSourceId(key);
          setFilter(defaultsOf(sources.find((item) => item.id === key)));
        }}
        className="max-w-md"
      >
        {sources.map((item) => (
          <SelectItem key={item.id}>{item.label}</SelectItem>
        ))}
      </Select>
      {source?.filters.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {source.filters.map((item) => (
            <CheckboxGroup
              key={item.key}
              label={item.label}
              description={t("filterHelp")}
              orientation="horizontal"
              value={filter[item.key] ?? []}
              onValueChange={(value) => setFilter((current) => ({ ...current, [item.key]: value }))}
            >
              {item.options.map((option) => (
                <Checkbox key={option.value} value={option.value}>
                  {option.label}
                </Checkbox>
              ))}
            </CheckboxGroup>
          ))}
        </div>
      ) : null}
      {preview ? <p className="rounded-medium bg-default-100 p-3 text-small">{t("preview", preview)}</p> : null}
      <Input label={t("subject")} labelPlacement="outside" value={subject} onValueChange={setSubject} isRequired />
      <Textarea label={t("body")} labelPlacement="outside" minRows={10} value={body} onValueChange={setBody} isRequired />
      <div className="flex flex-wrap items-center gap-2 text-tiny text-default-500">
        <span>{t("placeholders")}</span>
        {(source?.placeholders ?? []).map((key) => (
          <button key={key} type="button" className="rounded-medium bg-default-100 px-2 py-0.5 font-mono hover:bg-default-200" onClick={() => setBody((current) => `${current}{${key}}`)}>
            {`{${key}}`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="flat"
          startContent={<TestTube2 size={16} />}
          isLoading={busy}
          onPress={async () => {
            setBusy(true);
            const response = await sendMailingTestAction(payload());
            setBusy(false);
            addToast(response.ok ? { title: t("testSent", { to: response.data.to }), color: "success" } : { title: response.error, color: "danger" });
          }}
        >
          {t("test")}
        </Button>
        <Button color="primary" startContent={<Send size={16} />} isDisabled={!preview?.eligible || !subject.trim()} onPress={() => setConfirm(true)}>
          {t("send", { count: preview?.eligible ?? 0 })}
        </Button>
      </div>
      <ConfirmDialog
        isOpen={confirm}
        onOpenChange={setConfirm}
        title={t("confirmTitle")}
        message={t("confirmText", { count: preview?.eligible ?? 0 })}
        onConfirm={async () => {
          const response = await startMailingAction(payload());
          if (!response.ok) return void addToast({ title: response.error, color: "danger" });
          addToast({ title: t("started", { count: response.data.recipients }), color: "success" });
          setSubject("");
          setBody(defaultBody);
          router.refresh();
        }}
      />
    </section>
  );
}
