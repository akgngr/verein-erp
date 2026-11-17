"use client";
import { Button, toast } from "@heroui/react";
import { Checkbox, CheckboxGroup, Description, Dialog, FieldError, Input, Label, Radio, RadioGroup, Select, Spinner, StatusChip, Switch, TextArea, TextField } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  MessageCircle,
  MessageSquare,
  Save,
  Send,
  TestTube2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  launchCampaignAction,
  previewMailingAction,
  saveCampaignDraftAction,
  saveSegmentAction,
  sendMailingTestAction,
} from "../actions/mailing-actions";
import {
  designFromText,
  designSchema,
  renderEmailHtml,
  renderEmailText,
  type EmailDesign,
} from "../lib/email-design";
import { EmailBuilder } from "./email-builder";

export type WizardSource = {
  id: string;
  label: string;
  placeholders: string[];
  filters: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
    defaults: string[];
  }[];
  /** Önizlemede yer tutucuların örnek değerleri. */
  sampleVars: Record<string, string>;
};
export type WizardSegment = {
  id: string;
  name: string;
  source: string;
  filter: Record<string, string[]>;
};
export type WizardChannel = {
  key: string;
  icon: "Mail" | "MessageSquare" | "Send" | "MessageCircle";
  configured: boolean;
  capabilities: { subject: boolean; html: boolean; maxLength?: number };
};
export type WizardDraft = {
  id: string;
  name: string;
  channel: string;
  sourceId: string;
  filter: Record<string, string[]>;
  subject: string;
  body: string;
  bodyHtml: string | null;
  design: unknown;
  scheduledAt: string | null;
};

type Preview = {
  matched: number;
  eligible: number;
  noEmail: number;
  optOut: number;
};

const ICONS = { Mail, MessageSquare, Send, MessageCircle };
const STEPS = ["audience", "channel", "content", "send"] as const;
const CONTENT_GRID = "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]";
type Step = (typeof STEPS)[number];

/** Düz metni editör için paragraflara çevirir (ör. asistanın önerdiği taslak). */

const defaultsOf = (source: WizardSource | undefined) =>
  Object.fromEntries(
    (source?.filters ?? []).map((filter) => [filter.key, filter.defaults]),
  );

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
  defaultText,
  draft,
  initialSourceId,
  initialFilter,
}: {
  isOpen: boolean;
  onClose: () => void;
  sources: WizardSource[];
  segments: WizardSegment[];
  channels: WizardChannel[];
  defaultText: string;
  draft: WizardDraft | null;
  initialSourceId: string | null;
  /** Kısayoldan gelen ön filtre (ör. tek etkinlik); kaynağın varsayılanlarının üstüne yazılır. */
  initialFilter?: Record<string, string[]> | null;
}) {
  const t = useTranslations("mailings");
  const router = useRouter();
  const firstSource =
    draft?.sourceId ??
    (initialSourceId && sources.some((source) => source.id === initialSourceId)
      ? initialSourceId
      : (sources[0]?.id ?? ""));
  const [step, setStep] = useState<Step>("audience");
  const [draftId, setDraftId] = useState(draft?.id);
  const [name, setName] = useState(draft?.name ?? "");
  const [sourceId, setSourceId] = useState(firstSource);
  const source = useMemo(
    () => sources.find((item) => item.id === sourceId),
    [sources, sourceId],
  );
  const [filter, setFilter] = useState<Record<string, string[]>>(
    () =>
      draft?.filter ?? {
        ...defaultsOf(sources.find((item) => item.id === firstSource)),
        ...(initialFilter ?? {}),
      },
  );
  const [segmentName, setSegmentName] = useState("");
  const [channelKey, setChannelKey] = useState(
    draft?.channel ??
      (
        channels.find(
          (channel) => channel.key === "email" && channel.configured,
        ) ?? channels.find((channel) => channel.configured)
      )?.key ??
      channels[0]?.key ??
      "email",
  );
  const channel = channels.find((item) => item.key === channelKey);
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [text, setText] = useState(draft?.body || defaultText);
  const [when, setWhen] = useState<"now" | "later">(
    draft?.scheduledAt ? "later" : "now",
  );
  const [scheduledAt, setScheduledAt] = useState(
    toLocalInput(draft?.scheduledAt ?? null),
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [tracking, setTracking] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openedAt] = useState(() => Date.now());
  const sourceSegments = segments.filter(
    (segment) => segment.source === sourceId,
  );
  const html = channel?.capabilities.html ?? false;
  // Blok tasarımı: kayıtlı taslaktaki tasarım, yoksa taslak/varsayılan metinden başlangıç.
  const [design, setDesign] = useState<EmailDesign>(() => {
    const parsed = designSchema.safeParse(draft?.design);
    return parsed.success
      ? parsed.data
      : designFromText(draft?.body || defaultText);
  });

  useEffect(() => {
    if (!sourceId || !isOpen) return;
    let cancelled = false;
    void previewMailingAction({ sourceId, filter, channel: channelKey }).then(
      (response) => {
        if (!cancelled) setPreview(response.ok ? response.data : null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [sourceId, filter, channelKey, isOpen]);

  const payload = async () => {
    const email = html
      ? {
          html: renderEmailHtml(design, subject),
          text: renderEmailText(design),
        }
      : { html: "", text };
    return {
      id: draftId,
      name,
      channel: channelKey,
      sourceId,
      filter,
      subject: channel?.capabilities.subject ? subject : name,
      body: email.text,
      bodyHtml: html ? email.html : undefined,
      design: html ? design : undefined,
      scheduledAt:
        when === "later" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
      tracking: channelKey === "email" ? tracking : false,
    };
  };

  const index = STEPS.indexOf(step);
  const canNext =
    step === "audience"
      ? Boolean(name.trim().length >= 2 && sourceId && preview?.matched)
      : step === "channel"
        ? Boolean(channel?.configured)
        : step === "content"
          ? !channel?.capabilities.subject || subject.trim().length >= 3
          : true;
  // Sunucu ayrıca denetler; burada açılış anına göre kaba kontrol yeterli.
  const scheduleValid =
    when === "now" ||
    (scheduledAt && new Date(scheduledAt).getTime() > openedAt + 60_000);

  const close = () => {
    setStep("audience");
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => (open ? undefined : close())} isDismissable={false} size="full" scroll={"inside"} className={"w-full h-dvh max-w-full "}>
            <Dialog.Header className="flex items-center gap-3 border-b border-ink-200">
              <Dialog.Heading className="flex items-center gap-2">
                <div className="flex flex-col">
                  <span>
                    {draft ? t("wizard.editTitle") : t("wizard.title")}
                  </span>
                  <span className="text-sm font-normal text-ink-500">
                    {t("wizard.subtitle")}
                  </span>
                </div>
              </Dialog.Heading>
              <div className="ms-auto flex items-center gap-2">
                <Button
                  isDisabled={name.trim().length < 2 || !sourceId}
                  onPress={async () => {
                    setBusy("draft");
                    const response = await saveCampaignDraftAction(
                      await payload(),
                    );
                    setBusy(null);
                    if (!response.ok)
                      return void toast(response.error, { variant: "danger" });
                    setDraftId(response.data.id);
                    toast(t("wizard.draftSaved"), { variant: "success" });
                    router.refresh();
                  }}
                  variant={actionVariant("default", "flat")}
                  isPending={busy === "draft"}
                >
                  {busy === "draft" ? (
                    <Spinner size="sm" tone="current" />
                  ) : null}
                  {<Save className="h-4 w-4" />}
                  {t("wizard.saveDraft")}
                </Button>
                <Button
                  isIconOnly
                  aria-label={t("wizard.close")}
                  onPress={close}
                  variant={actionVariant("default", "light")}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </Dialog.Header>
            <Dialog.Body className="p-0">
              <div className="flex min-h-full flex-col md:flex-row">
                <nav
                  className="flex shrink-0 gap-1 overflow-x-auto border-b border-ink-200 p-3 md:w-64 md:flex-col md:border-b-0 md:border-e"
                  aria-label={t("wizard.steps")}
                >
                  {STEPS.map((item, position) => {
                    const done = position < index;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => position <= index && setStep(item)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors ${item === step ? "bg-brand-50 font-semibold text-accent" : done ? "text-ink-700 hover:bg-ink-100" : "cursor-default text-ink-400"}`}
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${item === step ? "bg-accent text-accent-foreground" : done ? "bg-success text-success-foreground" : "bg-ink-200"}`}
                        >
                          {done ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            position + 1
                          )}
                        </span>
                        {t(`wizard.step.${item}`)}
                      </button>
                    );
                  })}
                  {preview ? (
                    <div className="mt-auto hidden rounded-lg bg-ink-100 p-3 text-xs md:block">
                      <div className="flex items-center gap-2 font-semibold">
                        <Users className="h-4 w-4" />
                        {t("wizard.reach", { count: preview.eligible })}
                      </div>
                      <p className="mt-1 text-ink-500">
                        {t("wizard.reachDetail", preview)}
                      </p>
                    </div>
                  ) : null}
                </nav>

                <div className="min-w-0 flex-1 p-4 md:p-6">
                  {step === "audience" ? (
                    <div className="mx-auto flex max-w-3xl flex-col gap-5">
                      <TextField
                        value={name}
                        isRequired
                        onChange={setName}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("wizard.name")}</Label>
                        <Input placeholder={t("wizard.namePlaceholder")} />
                      </TextField>
                      {!sources.length ? (
                        <p className="text-sm text-ink-500">{t("noSources")}</p>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          <Select
                            value={sourceId}
                            onChange={(selectedValue) => {
                              const keys =
                                selectedValue === null
                                  ? undefined
                                  : String(selectedValue);
                              const key = keys;
                              if (typeof key !== "string") return;
                              setSourceId(key);
                              setFilter(
                                defaultsOf(
                                  sources.find((item) => item.id === key),
                                ),
                              );
                            }}
                          >
                            <Label>{t("source")}</Label>
                                {sources.map((item) => (
                                  <Select.Item
                                    key={item.id}
                                    id={item.id}
                                    textValue={String(item.label)}
                                  >
                                    <Label>{item.label}</Label>
                                  </Select.Item>
                                ))}
                          </Select>
                          <Select
                            placeholder={t("segmentNone")}
                            isDisabled={!sourceSegments.length}
                            value={null}
                            onChange={(selectedValue) => {
                              const keys =
                                selectedValue === null
                                  ? undefined
                                  : String(selectedValue);
                              const segment = sourceSegments.find(
                                (item) => item.id === keys,
                              );
                              if (segment) setFilter(segment.filter);
                            }}
                          >
                            <Label>{t("segment")}</Label>
                                {sourceSegments.map((item) => (
                                  <Select.Item
                                    key={item.id}
                                    id={item.id}
                                    textValue={String(item.name)}
                                  >
                                    <Label>{item.name}</Label>
                                  </Select.Item>
                                ))}
                          </Select>
                        </div>
                      )}
                      {source?.filters.length ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {source.filters.map((item) => (
                            <CheckboxGroup
                              key={item.key}
                              value={filter[item.key] ?? []}
                              onChange={(value) =>
                                setFilter((current) => ({
                                  ...current,
                                  [item.key]: value,
                                }))
                              }
                            >
                              <Label>{item.label}</Label>
                              <div className="flex flex-wrap gap-x-4 gap-y-2">
                                {item.options.map((option) => (
                                  <Checkbox
                                    key={option.value}
                                    value={option.value}
                                  >
                                      <Label>{option.label}</Label>
                                  </Checkbox>
                                ))}
                              </div>
                              <Description>
                                {item.options.length
                                  ? t("filterHelp")
                                  : t("filterEmpty")}
                              </Description>
                            </CheckboxGroup>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-end gap-2">
                        <TextField
                          value={segmentName}
                          onChange={setSegmentName}
                          className={["max-w-xs"].filter(Boolean).join(" ")}
                        >
                          <Label>{t("segmentSaveAs")}</Label>
                          <Input
                            className={["h-9 text-sm"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                        <Button
                          size="sm"
                          isDisabled={segmentName.trim().length < 2}
                          onPress={async () => {
                            setBusy("segment");
                            const response = await saveSegmentAction({
                              sourceId,
                              filter,
                              name: segmentName,
                            });
                            setBusy(null);
                            if (!response.ok)
                              return void toast(response.error, {
                                variant: "danger",
                              });
                            toast(t("segmentSaved"), { variant: "success" });
                            router.refresh();
                          }}
                          variant={actionVariant("default", "flat")}
                          isPending={busy === "segment"}
                        >
                          {busy === "segment" ? (
                            <Spinner size="sm" tone="current" />
                          ) : null}
                          {<Save size={14} />}
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
                          <button
                            key={item.key}
                            type="button"
                            disabled={!item.configured}
                            onClick={() => setChannelKey(item.key)}
                            className={`flex items-start gap-3 rounded-xl border-2 p-4 text-start transition-colors ${selected ? "border-accent bg-brand-50" : "border-ink-200 hover:border-ink-400"} ${item.configured ? "" : "cursor-not-allowed opacity-60"}`}
                          >
                            <Icon className="mt-0.5 h-6 w-6 text-accent" />
                            <span className="flex flex-col gap-1">
                              <span className="font-semibold">
                                {t(`channels.${item.key}.label` as never)}
                              </span>
                              <span className="text-sm text-ink-500">
                                {t(`channels.${item.key}.description` as never)}
                              </span>
                              {!item.configured ? (
                                <StatusChip tone="warning"
                                >
                                  {t("wizard.channelNotConfigured")}
                                </StatusChip>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                      <p className="text-sm text-ink-500 sm:col-span-2">
                        {t("wizard.moreChannels")}
                      </p>
                    </div>
                  ) : null}

                  {/* İçerik adımı açık kalır (gizlenir): editörün içeriği sonraki adımlarda da okunabilmeli. */}
                  {index >= STEPS.indexOf("content") ? (
                    <div
                      className={
                        step !== "content"
                          ? "hidden"
                          : html
                            ? "flex flex-col"
                            : CONTENT_GRID
                      }
                    >
                      <div className="flex min-w-0 flex-col gap-4">
                        {channel?.capabilities.subject ? (
                          <TextField
                            value={subject}
                            isRequired
                            onChange={setSubject}
                            className={["w-full"].filter(Boolean).join(" ")}
                          >
                            <Label>{t("subject")}</Label>
                            <Input
                              placeholder={t("wizard.subjectPlaceholder")}
                            />
                          </TextField>
                        ) : null}
                        {html ? (
                          <EmailBuilder
                            design={design}
                            onChange={setDesign}
                            placeholders={source?.placeholders ?? []}
                            sampleVars={source?.sampleVars ?? {}}
                          />
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                              <span>{t("placeholders")}</span>
                              {(source?.placeholders ?? []).map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  className="rounded-lg bg-ink-100 px-2 py-0.5 font-mono hover:bg-ink-200"
                                  onMouseDown={(event) =>
                                    event.preventDefault()
                                  }
                                  onClick={() =>
                                    setText((current) => `${current}{${key}}`)
                                  }
                                >
                                  {`{${key}}`}
                                </button>
                              ))}
                            </div>
                            <TextField
                              value={text}
                              onChange={setText}
                              className={["w-full"].filter(Boolean).join(" ")}
                            >
                              <Label>{t("body")}</Label>
                              <TextArea
                                rows={8}
                                className={["[field-sizing:content]"]
                                  .filter(Boolean)
                                  .join(" ")}
                              />
                              <Description>
                                {channel?.capabilities.maxLength
                                  ? t("wizard.length", {
                                      count: text.length,
                                      max: channel.capabilities.maxLength,
                                    })
                                  : undefined}
                              </Description>
                            </TextField>
                          </>
                        )}
                      </div>
                      <aside
                        className={html ? "hidden" : "flex flex-col gap-2"}
                      >
                        <span className="text-sm font-semibold">
                          {t("wizard.previewTitle")}
                        </span>
                        <div className="rounded-[2rem] border-8 border-ink-800 bg-ink-50 p-3 shadow-md dark:border-ink-300">
                          <div className="mb-2 flex items-center gap-2 text-xs text-ink-500">
                            {channel
                              ? (() => {
                                  const Icon = ICONS[channel.icon];
                                  return <Icon className="h-3.5 w-3.5" />;
                                })()
                              : null}
                            {t(`channels.${channelKey}.label` as never)}
                          </div>
                          <div className="rounded-xl bg-surface p-3 text-sm shadow-sm">
                            {channel?.capabilities.subject ? (
                              <p className="mb-1 font-semibold">
                                {subject || t("subject")}
                              </p>
                            ) : null}
                            <p className="line-clamp-[12] whitespace-pre-wrap text-ink-600">
                              {html ? t("wizard.previewEmail") : text}
                            </p>
                          </div>
                        </div>
                      </aside>
                    </div>
                  ) : null}

                  {step === "send" ? (
                    <div className="mx-auto flex max-w-3xl flex-col gap-5">
                      <dl className="grid gap-3 rounded-xl border border-ink-200 p-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-ink-500">
                            {t("wizard.name")}
                          </dt>
                          <dd className="font-medium">{name}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-500">
                            {t("wizard.channel")}
                          </dt>
                          <dd className="font-medium">
                            {t(`channels.${channelKey}.label` as never)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-500">
                            {t("source")}
                          </dt>
                          <dd className="font-medium">{source?.label}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-500">
                            {t("wizard.recipients")}
                          </dt>
                          <dd className="font-medium">
                            {preview
                              ? t("wizard.reach", { count: preview.eligible })
                              : "…"}
                          </dd>
                        </div>
                      </dl>
                      <RadioGroup
                        value={when}
                        onChange={(value) => setWhen(value as "now" | "later")}
                      >
                        <Label>{t("wizard.when")}</Label>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          <Radio value="now">
                              <Label>{t("wizard.now")}</Label>
                          </Radio>
                          <Radio value="later">
                              <Label>{t("wizard.later")}</Label>
                          </Radio>
                        </div>
                      </RadioGroup>
                      {when === "later" ? (
                        <TextField
                          value={scheduledAt}
                          isInvalid={Boolean(scheduledAt) && !scheduleValid}
                          onChange={setScheduledAt}
                          className={["max-w-xs"].filter(Boolean).join(" ")}
                        >
                          <Label>{t("wizard.scheduledAt")}</Label>
                          <Input type="datetime-local" />
                          <FieldError>{t("wizard.scheduleFuture")}</FieldError>
                        </TextField>
                      ) : null}
                      {channelKey === "email" ? (
                        <Switch
                          isSelected={tracking}
                          onChange={setTracking}
                          size={"sm"}
                        >
                            <Label>
                              <span className="flex flex-col">
                                <span className="text-sm">
                                  {t("wizard.tracking")}
                                </span>
                                <span className="text-xs text-ink-500">
                                  {t("wizard.trackingHelp")}
                                </span>
                              </span>
                            </Label>
                        </Switch>
                      ) : null}
                      <p className="rounded-lg bg-ink-100 p-3 text-sm text-ink-600">
                        {t("wizard.workflowHint")}
                      </p>
                      {channelKey === "email" ? (
                        <Button
                          className="self-start"
                          onPress={async () => {
                            setBusy("test");
                            const response = await sendMailingTestAction(
                              await payload(),
                            );
                            setBusy(null);
                            if (response.ok)
                              toast(t("testSent", { to: response.data.to }), {
                                variant: "success",
                              });
                            else toast(response.error, { variant: "danger" });
                          }}
                          variant={actionVariant("default", "flat")}
                          isPending={busy === "test"}
                        >
                          {busy === "test" ? (
                            <Spinner size="sm" tone="current" />
                          ) : null}
                          {<TestTube2 className="h-4 w-4" />}
                          {t("test")}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </Dialog.Body>
            <Dialog.Footer className="border-t border-ink-200">
              <Button
                isDisabled={index === 0}
                onPress={() => setStep(STEPS[index - 1])}
                variant={actionVariant("default", "light")}
              >
                {<ArrowLeft className="h-4 w-4" />}
                {t("wizard.back")}
              </Button>
              <div className="ms-auto" />
              {step !== "send" ? (
                <Button
                  isDisabled={!canNext}
                  onPress={() => setStep(STEPS[index + 1])}
                  variant={actionVariant("primary", "solid")}
                >
                  {t("wizard.next")}
                  {<ArrowRight className="h-4 w-4" />}
                </Button>
              ) : (
                <Button
                  isDisabled={!preview?.eligible || !scheduleValid}
                  onPress={async () => {
                    setBusy("launch");
                    const response = await launchCampaignAction(
                      await payload(),
                    );
                    setBusy(null);
                    if (!response.ok)
                      return void toast(response.error, { variant: "danger" });
                    toast(
                      response.data.scheduled
                        ? t("wizard.scheduled", {
                            count: response.data.recipients,
                          })
                        : t("started", { count: response.data.recipients }),
                      { variant: "success" },
                    );
                    close();
                    router.refresh();
                  }}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy === "launch"}
                >
                  {busy === "launch" ? (
                    <Spinner size="sm" tone="current" />
                  ) : null}
                  {<Send className="h-4 w-4" />}
                  {when === "later"
                    ? t("wizard.schedule", { count: preview?.eligible ?? 0 })
                    : t("send", { count: preview?.eligible ?? 0 })}
                </Button>
              )}
            </Dialog.Footer>
    </Dialog>
  );
}
