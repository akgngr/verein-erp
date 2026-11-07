"use client";

import { addToast, Button, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Radio, RadioGroup, Spinner } from "@heroui/react";
import { FileSignature, PenLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { cancelOnlineFormAction, getOnlineFormSignatureAction, previewOnlineFormAction, sendOnlineFormAction } from "../actions/online-form-actions";

type Kind = "MEMBER" | "STUDENT" | "GUARDIAN";
type Row = { id: string; kind: Kind; subjectName: string; signerRole: string; channel: string; sentTo: string; status: "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED"; expiresAt: string; openedAt: string | null; completedAt: string | null; signerName: string | null; consents: string[]; createdByLabel: string; createdAt: string };
type Preview = Extract<Awaited<ReturnType<typeof previewOnlineFormAction>>, { ok: true }>["data"];
const STATUS_COLOR = { PENDING: "primary", COMPLETED: "success", CANCELLED: "default", EXPIRED: "warning" } as const;

export function OnlineFormsApp({ rows, send, channels, can }: { rows: Row[]; send: { kind: Kind; subjectId: string } | null; channels: string[]; can: { update: boolean } }) {
  const t = useTranslations("online-forms");
  const format = useFormatter();
  const router = useRouter();
  const [signature, setSignature] = useState<string | null>(null);
  const date = (value: string | null) => (value ? format.dateTime(new Date(value), { dateStyle: "medium", timeStyle: "short" }) : "—");

  return (
    <div className="flex flex-col gap-4">
      {send ? <SendDialog target={send} channels={channels} onClose={() => router.replace("/online-formlar")} /> : null}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-large border border-dashed border-default-300 p-10 text-center text-default-500">
          <FileSignature className="size-8" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-large border border-default-200">
          <table className="w-full text-small">
            <thead className="bg-default-50 text-start text-default-500">
              <tr>{(["subject", "kind", "channel", "status", "sent", "completed", ""] as const).map((key) => <th key={key} className="px-3 py-2 text-start font-medium">{key ? t(`columns.${key}`) : ""}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-default-100">
                  <td className="px-3 py-2"><span className="font-medium">{row.subjectName}</span>{row.signerRole === "guardian" ? <span className="block text-tiny text-default-500">{t("viaGuardian")}</span> : null}</td>
                  <td className="px-3 py-2">{t(`kinds.${row.kind}`)}</td>
                  <td className="px-3 py-2">{t(`channels.${row.channel}` as never)}<span className="block text-tiny text-default-500">{row.sentTo}</span></td>
                  <td className="px-3 py-2"><Chip size="sm" variant="flat" color={STATUS_COLOR[row.status]}>{t(`status.${row.status}`)}</Chip>{row.status === "PENDING" && row.openedAt ? <span className="block text-tiny text-default-500">{t("opened")}</span> : null}</td>
                  <td className="px-3 py-2 text-default-600">{date(row.createdAt)}<span className="block text-tiny text-default-500">{row.createdByLabel}</span></td>
                  <td className="px-3 py-2 text-default-600">{row.completedAt ? <>{date(row.completedAt)}<span className="block text-tiny text-default-500">{row.signerName} · {row.consents.map((item) => t(`consents.${item}` as never)).join(", ")}</span></> : "—"}</td>
                  <td className="px-3 py-2 text-end">
                    {row.status === "COMPLETED" ? (
                      <Button size="sm" variant="flat" startContent={<PenLine className="size-4" />} onPress={async () => {
                        const response = await getOnlineFormSignatureAction({ id: row.id });
                        if (response.ok) setSignature(response.data.signature);
                      }}>{t("showSignature")}</Button>
                    ) : null}
                    {row.status === "PENDING" && can.update ? (
                      <Button size="sm" variant="light" color="danger" startContent={<X className="size-4" />} onPress={async () => {
                        const response = await cancelOnlineFormAction({ id: row.id });
                        if (response.ok) router.refresh();
                      }}>{t("cancel")}</Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={Boolean(signature)} onOpenChange={(open) => !open && setSignature(null)}>
        <ModalContent>
          <ModalHeader>{t("signature")}</ModalHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- şifresi çözülmüş data URL */}
          <ModalBody>{signature ? <img src={signature} alt={t("signature")} className="w-full rounded-medium border border-default-200 bg-white" /> : null}</ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}

function SendDialog({ target, channels, onClose }: { target: { kind: Kind; subjectId: string }; channels: string[]; onClose: () => void }) {
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
    return () => { cancelled = true; };
  }, [target, channels]);

  return (
    <Modal isOpen onOpenChange={(open) => !open && onClose()} size="lg">
      <ModalContent>
        <ModalHeader>{t("sendTitle")}</ModalHeader>
        <ModalBody>
          {error ? <p className="text-danger">{translate(error)}</p> : null}
          {!error && !preview ? <Spinner /> : null}
          {!error && preview ? (
            <div className="flex flex-col gap-4">
              <p className="text-small text-default-600">
                {preview.signerRole === "guardian" ? t("sendIntroGuardian", { name: preview.subjectName }) : t("sendIntro", { name: preview.subjectName })}
              </p>
              {preview.guardians.length > 1 ? (
                <RadioGroup label={t("guardian")} value={guardianId ?? ""} onValueChange={setGuardianId}>
                  {preview.guardians.map((item) => <Radio key={item.id} value={item.id}>{item.name}</Radio>)}
                </RadioGroup>
              ) : null}
              <RadioGroup label={t("channel")} value={channel} onValueChange={setChannel}>
                {channels.map((key) => (
                  <Radio key={key} value={key} isDisabled={!preview.addresses[key]} description={preview.addresses[key] ?? t("noAddress")}>{t(`channels.${key}` as never)}</Radio>
                ))}
              </RadioGroup>
              {channels.length === 0 ? <p className="text-small text-warning">{t("noChannels")}</p> : null}
              <p className="text-tiny text-default-500">{t("sendHint")}</p>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>{t("close")}</Button>
          <Button color="primary" isDisabled={!preview || !channel} isLoading={pending} onPress={() => start(async () => {
            const response = await sendOnlineFormAction({ ...target, channel, guardianId });
            if (!response.ok) return void addToast({ title: translate(response.error), color: "danger" });
            addToast({ title: t("sent"), color: "success" });
            onClose();
            router.refresh();
          })}>{t("send")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
