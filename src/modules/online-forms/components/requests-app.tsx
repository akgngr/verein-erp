"use client";

import { notify } from "@/shared/components/ui/notify";
import { Description, Dialog, Label, Radio, RadioGroup, Spinner, StatusChip, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { FileDown, FileSignature, PenLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import {
  cancelOnlineFormAction,
  getOnlineFormSignatureAction,
  previewOnlineFormAction,
  sendOnlineFormAction,
} from "../actions/online-form-actions";

type Kind = "MEMBER" | "STUDENT" | "GUARDIAN";
type Row = {
  id: string;
  documentKey: string | null;
  kind: Kind;
  subjectName: string;
  signerRole: string;
  channel: string;
  sentTo: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  expiresAt: string;
  openedAt: string | null;
  completedAt: string | null;
  signerName: string | null;
  consents: string[];
  createdByLabel: string;
  createdAt: string;
};
type Preview = Extract<
  Awaited<ReturnType<typeof previewOnlineFormAction>>,
  { ok: true }
>["data"];
const STATUS_COLOR = {
  PENDING: "primary",
  COMPLETED: "success",
  CANCELLED: "default",
  EXPIRED: "warning",
} as const;

export function OnlineFormsApp({
  rows,
  send,
  channels,
  can,
  filtered,
}: {
  filtered: boolean;
  rows: Row[];
  send: { kind: Kind; subjectId: string } | null;
  channels: string[];
  can: { update: boolean };
}) {
  const t = useTranslations("online-forms");
  const format = useFormatter();
  const router = useRouter();
  const [signature, setSignature] = useState<string | null>(null);
  const date = (value: string | null) =>
    value
      ? format.dateTime(new Date(value), {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  return (
    <div className="flex flex-col gap-4">
      {send ? (
        <SendDialog
          target={send}
          channels={channels}
          onClose={() => router.replace("/online-formlar")}
        />
      ) : null}
      {filtered ? (
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <span>
            {t("filteredPerson", { name: rows[0]?.subjectName ?? "—" })}
          </span>
          <Button
            size="sm"
            onPress={() => router.replace("/online-formlar")}
            variant={actionVariant("default", "light")}
          >
            {t("showAll")}
          </Button>
        </div>
      ) : null}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-ink-300 p-10 text-center text-ink-500">
          <FileSignature className="size-8" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-start text-ink-500">
              <tr>
                {(
                  [
                    "subject",
                    "kind",
                    "document",
                    "channel",
                    "status",
                    "sent",
                    "completed",
                    "",
                  ] as const
                ).map((key) => (
                  <th key={key} className="px-3 py-2 text-start font-medium">
                    {key ? t(`columns.${key}`) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-ink-100">
                  <td className="px-3 py-2">
                    <span className="font-medium">{row.subjectName}</span>
                    {row.signerRole === "guardian" ? (
                      <span className="block text-xs text-ink-500">
                        {t("viaGuardian")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{t(`kinds.${row.kind}`)}</td>
                  <td className="px-3 py-2">
                    {row.documentKey ? (
                      <a
                        href={`/api/online-forms/${row.id}/pdf`}
                        target="_blank"
                        rel="noopener"
                        className="font-mono text-xs text-accent underline-offset-2 hover:underline"
                      >
                        {row.documentKey}
                      </a>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {t(`channels.${row.channel}` as never)}
                    <span className="block text-xs text-ink-500">
                      {row.sentTo}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusChip tone={STATUS_COLOR[row.status]}
                    >
                      {t(`status.${row.status}`)}
                    </StatusChip>
                    {row.status === "PENDING" && row.openedAt ? (
                      <span className="block text-xs text-ink-500">
                        {t("opened")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-ink-600">
                    {date(row.createdAt)}
                    <span className="block text-xs text-ink-500">
                      {row.createdByLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-600">
                    {row.completedAt ? (
                      <>
                        {date(row.completedAt)}
                        <span className="block text-xs text-ink-500">
                          {row.signerName} ·{" "}
                          {row.consents
                            .map((item) => t(`consents.${item}` as never))
                            .join(", ")}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-end">
                    {row.status === "COMPLETED" ? (
                      <ActionLink
                        href={`/api/online-forms/${row.id}/pdf`}
                        target="_blank"
                        rel="noopener"
                        className={buttonClassName({
                          variant: actionVariant("default", "flat"),
                          size: "sm",
                          className: "me-2",
                        })}
                      >
                        {<FileDown className="size-4" />}
                        {t("pdf.download")}
                      </ActionLink>
                    ) : null}
                    {row.status === "COMPLETED" ? (
                      <Button
                        size="sm"
                        onPress={async () => {
                          const response = await getOnlineFormSignatureAction({
                            id: row.id,
                          });
                          if (response.ok)
                            setSignature(response.data.signature);
                        }}
                        variant={actionVariant("default", "flat")}
                      >
                        {<PenLine className="size-4" />}
                        {t("showSignature")}
                      </Button>
                    ) : null}
                    {row.status === "PENDING" && can.update ? (
                      <Button
                        size="sm"
                        onPress={async () => {
                          const response = await cancelOnlineFormAction({
                            id: row.id,
                          });
                          if (response.ok) router.refresh();
                        }}
                        variant={actionVariant("danger", "light")}
                      >
                        {<X className="size-4" />}
                        {t("cancel")}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        isOpen={Boolean(signature)}
        onOpenChange={(open) => !open && setSignature(null)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("signature")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                {signature ? (
                  // eslint-disable-next-line @next/next/no-img-element -- şifresi çözülmüş data URL; next/image uygun değil
                  <img
                    src={signature}
                    alt={t("signature")}
                    className="w-full rounded-lg border border-ink-200 bg-white"
                  />
                ) : null}
              </Dialog.Body>
      </Dialog>
    </div>
  );
}

function SendDialog({
  target,
  channels,
  onClose,
}: {
  target: { kind: Kind; subjectId: string };
  channels: string[];
  onClose: () => void;
}) {
  const t = useTranslations("online-forms");
  const translate = useTranslateMessage();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState("");
  const [guardianId, setGuardianId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void previewOnlineFormAction(target).then((response) => {
      if (cancelled) return;
      if (!response.ok) return setError(response.error);
      setPreview(response.data);
      setGuardianId(response.data.guardians[0]?.id ?? null);
      setChannel(channels.find((key) => response.data.addresses[key]) ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [target, channels]);

  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} size="lg" className={"w-full max-w-lg "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {t("sendTitle")}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              {error ? <p className="text-danger">{translate(error)}</p> : null}
              {!error && !preview ? <Spinner></Spinner> : null}
              {!error && preview ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-ink-600">
                    {preview.signerRole === "guardian"
                      ? t("sendIntroGuardian", { name: preview.subjectName })
                      : t("sendIntro", { name: preview.subjectName })}
                  </p>
                  {preview.guardians.length > 1 ? (
                    <RadioGroup
                      value={guardianId ?? ""}
                      onChange={setGuardianId}
                    >
                      <Label>{t("guardian")}</Label>
                      <div className="flex flex-col gap-2">
                        {preview.guardians.map((item) => (
                          <Radio key={item.id} value={item.id}>
                              <Label>{item.name}</Label>
                          </Radio>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : null}
                  <RadioGroup value={channel} onChange={setChannel}>
                    <Label>{t("channel")}</Label>
                    <div className="flex flex-col gap-2">
                      {channels.map((key) => (
                        <Radio
                          key={key}
                          value={key}
                          isDisabled={!preview.addresses[key]}
                        >
                            <Label>{t(`channels.${key}` as never)}</Label>
                          <Description>
                            {preview.addresses[key] ?? t("noAddress")}
                          </Description>
                        </Radio>
                      ))}
                    </div>
                  </RadioGroup>
                  {channels.length === 0 ? (
                    <p className="text-sm text-warning">{t("noChannels")}</p>
                  ) : null}
                  <p className="text-xs text-ink-500">{t("sendHint")}</p>
                </div>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                onPress={onClose}
                variant={actionVariant("default", "light")}
              >
                {t("close")}
              </Button>
              <Button
                isDisabled={!preview || !channel}
                onPress={() =>
                  start(async () => {
                    const response = await sendOnlineFormAction({
                      ...target,
                      channel,
                      guardianId,
                    });
                    if (!response.ok)
                      return void notify.error(translate(response.error));
                    notify.success(t("sent"));
                    onClose();
                    router.refresh();
                  })
                }
                variant={actionVariant("primary", "solid")}
                isPending={pending}
              >
                {pending ? <Spinner size="sm" tone="current" /> : null}
                {t("send")}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
