"use client";

import {
  addToast,
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  SelectItem,
  Spinner,
  Textarea,
} from "@heroui/react";
import { ArrowLeft, ArrowRight, Check, Mail, MessageCircle, MessageSquare, Save, Send, TestTube2, Users, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { ClientSelect } from "@/shared/components/ui/client-select";

import { launchCampaignAction, previewMailingAction, saveCampaignDraftAction, saveSegmentAction, sendMailingTestAction } from "../actions/mailing-actions";
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

export type WizardSource = {
  id: string;
  label: string;
  placeholders: string[];
  filters: { key: string; label: string; options: { value: string; label: string }[]; defaults: string[] }[];
};
export type WizardSegment = { id: string; name: string; source: string; filter: Record<string, string[]> };
export type WizardChannel = { key: string; icon: "Mail" | "MessageSquare" | "Send" | "MessageCircle"; configured: boolean; capabilities: { subject: boolean; html: boolean; maxLength?: number } };
export type WizardDraft = { id: string; name: string; channel: string; sourceId: string; filter: Record<string, string[]>; subject: string; body: string; bodyHtml: string | null; scheduledAt: string | null };

type Preview = { matched: number; eligible: number; noEmail: number; optOut: number };

const ICONS = { Mail, MessageSquare, Send, MessageCircle };
const STEPS = ["audience", "channel", "content", "send"] as const;
const CONTENT_GRID = "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]";
type Step = (typeof STEPS)[number];

/** Düz metni editör için paragraflara çevirir (ör. asistanın önerdiği taslak). */
const textToHtml = (text: string) => text.split(/\n{2,}/).map((block) => `<p>${block.split("\n").map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br>")}</p>`).join("");

const defaultsOf = (source: WizardSource | undefined) => Object.fromEntries((source?.filters ?? []).map((filter) => [filter.key, filter.defaults]));

/** datetime-local value (local time) from an ISO string and back. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/**
 * Yeni kampanya sihirbazı — iş akışı editörü gibi tam ekran modal. 4 adım: hedef kitle, kanal, içerik,
 * gönderim (hemen/planlı + test). Başlatılan her kampanya kendi iş akışını oluşturur.
 */
export function CampaignWizard({
  isOpen,
  onClose,
  sources,
  segments,
  channels,
  defaultHtml,
  defaultText,
  draft,
  initialSourceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  sources: WizardSource[];
  segments: WizardSegment[];
  channels: WizardChannel[];
  defaultHtml: string;
  defaultText: string;
  draft: WizardDraft | null;
  initialSourceId: string | null;
}) {
  const t = useTranslations("mailings");
  const router = useRouter();
  const editor = useRef<EmailEditorFieldHandle>(null);
  const firstSource = draft?.sourceId ?? (initialSourceId && sources.some((source) => source.id === initialSourceId) ? initialSourceId : (sources[0]?.id ?? ""));
  const [step, setStep] = useState<Step>("audience");
  const [draftId, setDraftId] = useState(draft?.id);
  const [name, setName] = useState(draft?.name ?? "");
  const [sourceId, setSourceId] = useState(firstSource);
  const source = useMemo(() => sources.find((item) => item.id === sourceId), [sources, sourceId]);
  const [filter, setFilter] = useState<Record<string, string[]>>(() => draft?.filter ?? defaultsOf(sources.find((item) => item.id === firstSource)));
  const [segmentName, setSegmentName] = useState("");
  const [channelKey, setChannelKey] = useState(draft?.channel ?? channels.find((channel) => channel.configured)?.key ?? channels[0]?.key ?? "email");
  const channel = channels.find((item) => item.key === channelKey);
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [text, setText] = useState(draft?.body || defaultText);
  const [when, setWhen] = useState<"now" | "later">(draft?.scheduledAt ? "later" : "now");
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(draft?.scheduledAt ?? null));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openedAt] = useState(() => Date.now());
  const sourceSegments = segments.filter((segment) => segment.source === sourceId);
  const html = channel?.capabilities.html ?? false;

  useEffect(() => {
    if (!sourceId || !isOpen) return;
    let cancelled = false;
    void previewMailingAction({ sourceId, filter, channel: channelKey }).then((response) => {
      if (!cancelled) setPreview(response.ok ? response.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [sourceId, filter, channelKey, isOpen]);

  const payload = async () => {
    const email = html ? ((await editor.current?.getEmail()) ?? { html: "", text: "" }) : { html: "", text };
    return {
      id: draftId,
      name,
      channel: channelKey,
      sourceId,
      filter,
      subject: channel?.capabilities.subject ? subject : name,
      body: email.text,
      bodyHtml: html ? email.html : undefined,
      scheduledAt: when === "later" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    };
  };

  const index = STEPS.indexOf(step);
  const canNext = step === "audience" ? Boolean(name.trim().length >= 2 && sourceId && preview?.matched) : step === "channel" ? Boolean(channel?.configured) : step === "content" ? (!channel?.capabilities.subject || subject.trim().length >= 3) : true;
  // Sunucu ayrıca denetler; burada açılış anına göre kaba kontrol yeterli.
  const scheduleValid = when === "now" || (scheduledAt && new Date(scheduledAt).getTime() > openedAt + 60_000);

  const close = () => {
    setStep("audience");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => (open ? undefined : close())} size="full" hideCloseButton isDismissable={false} scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-3 border-b border-default-200">
          <div className="flex flex-col">
            <span>{draft ? t("wizard.editTitle") : t("wizard.title")}</span>
            <span className="text-small font-normal text-default-500">{t("wizard.subtitle")}</span>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Button variant="flat" startContent={<Save className="h-4 w-4" />} isLoading={busy === "draft"} isDisabled={name.trim().length < 2 || !sourceId}
              onPress={async () => {
                setBusy("draft");
                const response = await saveCampaignDraftAction(await payload());
                setBusy(null);
                if (!response.ok) return void addToast({ title: response.error, color: "danger" });
                setDraftId(response.data.id);
                addToast({ title: t("wizard.draftSaved"), color: "success" });
                router.refresh();
              }}>
              {t("wizard.saveDraft")}
            </Button>
            <Button isIconOnly variant="light" aria-label={t("wizard.close")} onPress={close}><X className="h-5 w-5" /></Button>
          </div>
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="flex min-h-full flex-col md:flex-row">
            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-default-200 p-3 md:w-64 md:flex-col md:border-b-0 md:border-e" aria-label={t("wizard.steps")}>
              {STEPS.map((item, position) => {
                const done = position < index;
                return (
                  <button key={item} type="button" onClick={() => position <= index && setStep(item)}
                    className={`flex items-center gap-3 rounded-medium px-3 py-2 text-start text-small transition-colors ${item === step ? "bg-primary-50 font-semibold text-primary" : done ? "text-default-700 hover:bg-default-100" : "cursor-default text-default-400"}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-tiny ${item === step ? "bg-primary text-primary-foreground" : done ? "bg-success text-success-foreground" : "bg-default-200"}`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : position + 1}
                    </span>
                    {t(`wizard.step.${item}`)}
                  </button>
                );
              })}
              {preview ? (
                <div className="mt-auto hidden rounded-medium bg-default-100 p-3 text-tiny md:block">
                  <div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" />{t("wizard.reach", { count: preview.eligible })}</div>
                  <p className="mt-1 text-default-500">{t("wizard.reachDetail", preview)}</p>
                </div>
              ) : null}
            </nav>

            <div className="min-w-0 flex-1 p-4 md:p-6">
              {step === "audience" ? (
                <div className="mx-auto flex max-w-3xl flex-col gap-5">
                  <Input label={t("wizard.name")} labelPlacement="outside" placeholder={t("wizard.namePlaceholder")} value={name} onValueChange={setName} isRequired />
                  {!sources.length ? <p className="text-small text-default-500">{t("noSources")}</p> : (
                    <div className="grid gap-4 md:grid-cols-2">
                      <ClientSelect label={t("source")} labelPlacement="outside" selectedKeys={[sourceId]}
                        onSelectionChange={(keys) => {
                          const key = Array.from(keys)[0];
                          if (typeof key !== "string") return;
                          setSourceId(key);
                          setFilter(defaultsOf(sources.find((item) => item.id === key)));
                        }}
                      >
                        {sources.map((item) => <SelectItem key={item.id}>{item.label}</SelectItem>)}
                      </ClientSelect>
                      <ClientSelect label={t("segment")} labelPlacement="outside" placeholder={t("segmentNone")} isDisabled={!sourceSegments.length} selectedKeys={[]}
                        onSelectionChange={(keys) => {
                          const segment = sourceSegments.find((item) => item.id === Array.from(keys)[0]);
                          if (segment) setFilter(segment.filter);
                        }}
                      >
                        {sourceSegments.map((item) => <SelectItem key={item.id}>{item.name}</SelectItem>)}
                      </ClientSelect>
                    </div>
                  )}
                  {source?.filters.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {source.filters.map((item) => (
                        <CheckboxGroup key={item.key} label={item.label} description={item.options.length ? t("filterHelp") : t("filterEmpty")} orientation="horizontal"
                          value={filter[item.key] ?? []} onValueChange={(value) => setFilter((current) => ({ ...current, [item.key]: value }))}>
                          {item.options.map((option) => <Checkbox key={option.value} value={option.value}>{option.label}</Checkbox>)}
                        </CheckboxGroup>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-end gap-2">
                    <Input size="sm" label={t("segmentSaveAs")} labelPlacement="outside" value={segmentName} onValueChange={setSegmentName} className="max-w-xs" />
                    <Button size="sm" variant="flat" startContent={<Save size={14} />} isDisabled={segmentName.trim().length < 2} isLoading={busy === "segment"}
                      onPress={async () => {
                        setBusy("segment");
                        const response = await saveSegmentAction({ sourceId, filter, name: segmentName });
                        setBusy(null);
                        if (!response.ok) return void addToast({ title: response.error, color: "danger" });
                        addToast({ title: t("segmentSaved"), color: "success" });
                        router.refresh();
                      }}>
                      {t("segmentSave")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {step === "channel" ? (
                <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
                  {channels.map((item) => {
                    const Icon = ICONS[item.icon];
                    const selected = item.key === channelKey;
                    return (
                      <button key={item.key} type="button" disabled={!item.configured} onClick={() => setChannelKey(item.key)}
                        className={`flex items-start gap-3 rounded-large border-2 p-4 text-start transition-colors ${selected ? "border-primary bg-primary-50" : "border-default-200 hover:border-default-400"} ${item.configured ? "" : "cursor-not-allowed opacity-60"}`}>
                        <Icon className="mt-0.5 h-6 w-6 text-primary" />
                        <span className="flex flex-col gap-1">
                          <span className="font-semibold">{t(`channels.${item.key}.label` as never)}</span>
                          <span className="text-small text-default-500">{t(`channels.${item.key}.description` as never)}</span>
                          {!item.configured ? <Chip size="sm" color="warning" variant="flat">{t("wizard.channelNotConfigured")}</Chip> : null}
                        </span>
                      </button>
                    );
                  })}
                  <p className="text-small text-default-500 sm:col-span-2">{t("wizard.moreChannels")}</p>
                </div>
              ) : null}

              {/* İçerik adımı açık kalır (gizlenir): editörün içeriği sonraki adımlarda da okunabilmeli. */}
              {index >= STEPS.indexOf("content") ? (
                <div className={step === "content" ? CONTENT_GRID : "hidden"}>
                  <div className="flex min-w-0 flex-col gap-4">
                    {channel?.capabilities.subject ? <Input label={t("subject")} labelPlacement="outside" placeholder={t("wizard.subjectPlaceholder")} value={subject} onValueChange={setSubject} isRequired /> : null}
                    <div className="flex flex-wrap items-center gap-2 text-tiny text-default-500">
                      <span>{t("placeholders")}</span>
                      {(source?.placeholders ?? []).map((key) => (
                        <button key={key} type="button" className="rounded-medium bg-default-100 px-2 py-0.5 font-mono hover:bg-default-200"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => (html ? editor.current?.insertText(`{${key}}`) : setText((current) => `${current}{${key}}`))}>
                          {`{${key}}`}
                        </button>
                      ))}
                      {html ? <span className="ms-auto">{t("editorHint")}</span> : null}
                    </div>
                    {html ? (
                      <EmailEditorField handleRef={editor} initialHtml={draft?.bodyHtml || (draft?.body ? textToHtml(draft.body) : defaultHtml)} placeholder={t("editorPlaceholder")} />
                    ) : (
                      <Textarea minRows={8} value={text} onValueChange={setText} label={t("body")} labelPlacement="outside"
                        description={channel?.capabilities.maxLength ? t("wizard.length", { count: text.length, max: channel.capabilities.maxLength }) : undefined} />
                    )}
                  </div>
                  <aside className="flex flex-col gap-2">
                    <span className="text-small font-semibold">{t("wizard.previewTitle")}</span>
                    <div className="rounded-[2rem] border-8 border-default-800 bg-default-50 p-3 shadow-medium dark:border-default-300">
                      <div className="mb-2 flex items-center gap-2 text-tiny text-default-500">
                        {channel ? (() => { const Icon = ICONS[channel.icon]; return <Icon className="h-3.5 w-3.5" />; })() : null}
                        {t(`channels.${channelKey}.label` as never)}
                      </div>
                      <div className="rounded-large bg-content1 p-3 text-small shadow-small">
                        {channel?.capabilities.subject ? <p className="mb-1 font-semibold">{subject || t("subject")}</p> : null}
                        <p className="line-clamp-[12] whitespace-pre-wrap text-default-600">{html ? t("wizard.previewEmail") : text}</p>
                      </div>
                    </div>
                  </aside>
                </div>
              ) : null}

              {step === "send" ? (
                <div className="mx-auto flex max-w-3xl flex-col gap-5">
                  <dl className="grid gap-3 rounded-large border border-default-200 p-4 sm:grid-cols-2">
                    <div><dt className="text-tiny text-default-500">{t("wizard.name")}</dt><dd className="font-medium">{name}</dd></div>
                    <div><dt className="text-tiny text-default-500">{t("wizard.channel")}</dt><dd className="font-medium">{t(`channels.${channelKey}.label` as never)}</dd></div>
                    <div><dt className="text-tiny text-default-500">{t("source")}</dt><dd className="font-medium">{source?.label}</dd></div>
                    <div><dt className="text-tiny text-default-500">{t("wizard.recipients")}</dt><dd className="font-medium">{preview ? t("wizard.reach", { count: preview.eligible }) : "…"}</dd></div>
                  </dl>
                  <RadioGroup label={t("wizard.when")} orientation="horizontal" value={when} onValueChange={(value) => setWhen(value as "now" | "later")}>
                    <Radio value="now">{t("wizard.now")}</Radio>
                    <Radio value="later">{t("wizard.later")}</Radio>
                  </RadioGroup>
                  {when === "later" ? (
                    <Input type="datetime-local" label={t("wizard.scheduledAt")} labelPlacement="outside" className="max-w-xs" value={scheduledAt} onValueChange={setScheduledAt}
                      isInvalid={Boolean(scheduledAt) && !scheduleValid} errorMessage={t("wizard.scheduleFuture")} />
                  ) : null}
                  <p className="rounded-medium bg-default-100 p-3 text-small text-default-600">{t("wizard.workflowHint")}</p>
                  {channelKey === "email" ? (
                    <Button variant="flat" className="self-start" startContent={<TestTube2 className="h-4 w-4" />} isLoading={busy === "test"}
                      onPress={async () => {
                        setBusy("test");
                        const response = await sendMailingTestAction(await payload());
                        setBusy(null);
                        addToast(response.ok ? { title: t("testSent", { to: response.data.to }), color: "success" } : { title: response.error, color: "danger" });
                      }}>
                      {t("test")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-default-200">
          <Button variant="light" startContent={<ArrowLeft className="h-4 w-4" />} isDisabled={index === 0} onPress={() => setStep(STEPS[index - 1])}>{t("wizard.back")}</Button>
          <div className="ms-auto" />
          {step !== "send" ? (
            <Button color="primary" endContent={<ArrowRight className="h-4 w-4" />} isDisabled={!canNext} onPress={() => setStep(STEPS[index + 1])}>{t("wizard.next")}</Button>
          ) : (
            <Button color="primary" startContent={<Send className="h-4 w-4" />} isLoading={busy === "launch"} isDisabled={!preview?.eligible || !scheduleValid}
              onPress={async () => {
                setBusy("launch");
                const response = await launchCampaignAction(await payload());
                setBusy(null);
                if (!response.ok) return void addToast({ title: response.error, color: "danger" });
                addToast({ title: response.data.scheduled ? t("wizard.scheduled", { count: response.data.recipients }) : t("started", { count: response.data.recipients }), color: "success" });
                close();
                router.refresh();
              }}>
              {when === "later" ? t("wizard.schedule", { count: preview?.eligible ?? 0 }) : t("send", { count: preview?.eligible ?? 0 })}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
