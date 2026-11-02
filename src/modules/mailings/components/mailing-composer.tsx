"use client";

import { addToast, Button, Checkbox, CheckboxGroup, Input, Select, SelectItem, Spinner } from "@heroui/react";
import { Save, Send, TestTube2, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { deleteSegmentAction, previewMailingAction, saveSegmentAction, sendMailingTestAction, startMailingAction } from "../actions/mailing-actions";
import type { EmailEditorFieldHandle } from "./email-editor-field";

// Editör yalnızca tarayıcıda çalışır (Tiptap/DOM).
const EmailEditorField = dynamic(() => import("./email-editor-field"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[320px] items-center justify-center rounded-medium border border-default-200">
      <Spinner />
    </div>
  ),
});

export type ComposerSource = {
  id: string;
  label: string;
  placeholders: string[];
  filters: { key: string; label: string; options: { value: string; label: string }[]; defaults: string[] }[];
};
export type ComposerSegment = { id: string; name: string; source: string; filter: Record<string, string[]> };
type Preview = { matched: number; eligible: number; noEmail: number; optOut: number };

const defaultsOf = (source: ComposerSource | undefined) => Object.fromEntries((source?.filters ?? []).map((filter) => [filter.key, filter.defaults]));

/** Kaynak, segment ve filtreler; görsel editör; alıcı özeti; test ve gönderim. */
export function MailingComposer({ sources, segments, initialSourceId, defaultHtml }: { sources: ComposerSource[]; segments: ComposerSegment[]; initialSourceId: string | null; defaultHtml: string }) {
  const t = useTranslations("mailings");
  const router = useRouter();
  const editor = useRef<EmailEditorFieldHandle>(null);
  const [sourceId, setSourceId] = useState(initialSourceId && sources.some((source) => source.id === initialSourceId) ? initialSourceId : (sources[0]?.id ?? ""));
  const source = useMemo(() => sources.find((item) => item.id === sourceId), [sources, sourceId]);
  const [filter, setFilter] = useState<Record<string, string[]>>(() => defaultsOf(source));
  const [segmentId, setSegmentId] = useState("");
  const [segmentName, setSegmentName] = useState("");
  const [subject, setSubject] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const sourceSegments = segments.filter((segment) => segment.source === sourceId);

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

  const payload = async () => {
    const email = (await editor.current?.getEmail()) ?? { html: "", text: "" };
    return { sourceId, filter, subject, body: email.text, bodyHtml: email.html };
  };

  return (
    <section className="flex flex-col gap-4 rounded-large border border-default-200 bg-content1 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label={t("source")}
          labelPlacement="outside"
          selectedKeys={[sourceId]}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0];
            if (typeof key !== "string") return;
            setSourceId(key);
            setSegmentId("");
            setFilter(defaultsOf(sources.find((item) => item.id === key)));
          }}
        >
          {sources.map((item) => (
            <SelectItem key={item.id}>{item.label}</SelectItem>
          ))}
        </Select>
        <Select
          label={t("segment")}
          labelPlacement="outside"
          placeholder={t("segmentNone")}
          selectedKeys={segmentId ? [segmentId] : []}
          isDisabled={!sourceSegments.length}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0];
            const segment = sourceSegments.find((item) => item.id === key);
            setSegmentId(typeof key === "string" ? key : "");
            if (segment) {
              setFilter(segment.filter);
              setSegmentName(segment.name);
            }
          }}
        >
          {sourceSegments.map((item) => (
            <SelectItem key={item.id}>{item.name}</SelectItem>
          ))}
        </Select>
      </div>
      {source?.filters.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {source.filters.map((item) => (
            <CheckboxGroup
              key={item.key}
              label={item.label}
              description={item.options.length ? t("filterHelp") : t("filterEmpty")}
              orientation="horizontal"
              value={filter[item.key] ?? []}
              onValueChange={(value) => {
                setSegmentId("");
                setFilter((current) => ({ ...current, [item.key]: value }));
              }}
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
      <div className="flex flex-wrap items-end gap-2">
        <Input size="sm" label={t("segmentSaveAs")} labelPlacement="outside" value={segmentName} onValueChange={setSegmentName} className="max-w-xs" />
        <Button
          size="sm"
          variant="flat"
          startContent={<Save size={14} />}
          isDisabled={segmentName.trim().length < 2}
          isLoading={busy === "segment"}
          onPress={async () => {
            setBusy("segment");
            const response = await saveSegmentAction({ sourceId, filter, name: segmentName });
            setBusy(null);
            if (!response.ok) return void addToast({ title: response.error, color: "danger" });
            setSegmentId(response.data.id);
            addToast({ title: t("segmentSaved"), color: "success" });
            router.refresh();
          }}
        >
          {t("segmentSave")}
        </Button>
        {segmentId ? (
          <Button
            size="sm"
            variant="light"
            color="danger"
            startContent={<Trash2 size={14} />}
            onPress={async () => {
              const response = await deleteSegmentAction({ id: segmentId });
              if (!response.ok) return void addToast({ title: response.error, color: "danger" });
              setSegmentId("");
              router.refresh();
            }}
          >
            {t("segmentDelete")}
          </Button>
        ) : null}
      </div>
      <Input label={t("subject")} labelPlacement="outside" value={subject} onValueChange={setSubject} isRequired />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-tiny text-default-500">
          <span>{t("placeholders")}</span>
          {(source?.placeholders ?? []).map((key) => (
            <button
              key={key}
              type="button"
              className="rounded-medium bg-default-100 px-2 py-0.5 font-mono hover:bg-default-200"
              // Editör odağını kaybetmesin: ekleme imlecin olduğu yere yapılır.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.current?.insertText(`{${key}}`)}
            >
              {`{${key}}`}
            </button>
          ))}
          <span className="ml-auto">{t("editorHint")}</span>
        </div>
        <EmailEditorField key={editorKey} handleRef={editor} initialHtml={defaultHtml} placeholder={t("editorPlaceholder")} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="flat"
          startContent={<TestTube2 size={16} />}
          isLoading={busy === "test"}
          onPress={async () => {
            setBusy("test");
            const response = await sendMailingTestAction(await payload());
            setBusy(null);
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
          const response = await startMailingAction(await payload());
          if (!response.ok) return void addToast({ title: response.error, color: "danger" });
          addToast({ title: t("started", { count: response.data.recipients }), color: "success" });
          setSubject("");
          setEditorKey((key) => key + 1);
          router.refresh();
        }}
      />
    </section>
  );
}
