"use client";

import { addToast, Button, Chip } from "@heroui/react";
import { CheckCircle2, Download, FileUp, Inbox, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { deleteInboxMessageAction, fetchInboxAction, importAttachmentAction, setInboxStatusAction } from "../actions/inbox-actions";

export type InboxRow = {
  id: string;
  source: string;
  fromAddress: string | null;
  fromName: string | null;
  subject: string;
  receivedAt: string;
  snippet: string | null;
  status: "NEW" | "DONE";
  attachments: { id: string; fileName: string; size: number; importedTo: string | null }[];
};

/** Gelen kutusu: IMAP'ten al, .eml yükle, ekleri muhasebeye aktar. */
export function InboxPanel({ rows, imapConfigured, accountingUsable, canManage, canDelete, filter }: {
  rows: InboxRow[];
  imapConfigured: boolean;
  accountingUsable: boolean;
  canManage: boolean;
  canDelete: boolean;
  filter: "NEW" | "DONE" | "ALL";
}) {
  const t = useTranslations("mail.inbox");
  const format = useFormatter();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchNow = async () => {
    setBusy("fetch");
    const response = await fetchInboxAction({});
    setBusy(null);
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: t("fetched", response.data), color: "success" });
    router.refresh();
  };

  const uploadEml = async (file: File) => {
    setBusy("eml");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/mail/inbox/eml", { method: "POST", body });
    const json = (await response.json()) as { ok: boolean; error?: string; created?: boolean; attachments?: number };
    setBusy(null);
    if (!json.ok) return void addToast({ title: json.error ?? t("errors.emlInvalid"), color: "danger" });
    addToast({ title: json.created ? t("emlImported", { attachments: json.attachments ?? 0 }) : t("emlDuplicate"), color: json.created ? "success" : "warning" });
    router.refresh();
  };

  const importAttachment = async (id: string) => {
    setBusy(id);
    const response = await importAttachmentAction({ id });
    setBusy(null);
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: response.data.duplicate ? t("importDuplicate") : t("imported"), color: response.data.duplicate ? "warning" : "success" });
    router.refresh();
  };

  const filters = [
    ["NEW", t("filters.NEW")],
    ["DONE", t("filters.DONE")],
    ["ALL", t("filters.ALL")],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {canManage ? (
          <>
            <Button color="primary" startContent={<Inbox size={16} />} isDisabled={!imapConfigured} isLoading={busy === "fetch"} onPress={fetchNow}>
              {t("fetch")}
            </Button>
            <Button variant="flat" startContent={<FileUp size={16} />} isLoading={busy === "eml"} onPress={() => fileInput.current?.click()}>
              {t("uploadEml")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".eml,message/rfc822"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadEml(file);
              }}
            />
          </>
        ) : null}
        <div className="ml-auto flex gap-1">
          {filters.map(([key, label]) => (
            <Button key={key} size="sm" variant={filter === key ? "solid" : "light"} color={filter === key ? "primary" : "default"} onPress={() => router.push(`/mail/gelen-kutusu?durum=${key}`)}>
              {label}
            </Button>
          ))}
        </div>
      </div>
      {!accountingUsable ? <p className="text-small text-warning-600">{t("accountingOff")}</p> : null}
      {rows.length === 0 ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-large border border-default-200 bg-content1 p-4">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{row.subject || t("noSubject")}</div>
                  <div className="text-tiny text-default-500">
                    {[row.fromName, row.fromAddress].filter(Boolean).join(" · ")} · {format.dateTime(new Date(row.receivedAt), { dateStyle: "medium", timeStyle: "short" })} · {row.source}
                  </div>
                  {row.snippet ? <p className="mt-1 line-clamp-2 text-small text-default-600">{row.snippet}</p> : null}
                </div>
                <Chip size="sm" variant="flat" color={row.status === "NEW" ? "warning" : "success"}>
                  {t(`status.${row.status}`)}
                </Chip>
                {canManage ? (
                  <Button size="sm" variant="light" isIconOnly aria-label={row.status === "NEW" ? t("markDone") : t("markNew")} onPress={async () => {
                    const response = await setInboxStatusAction({ id: row.id, status: row.status === "NEW" ? "DONE" : "NEW" });
                    if (response.ok) router.refresh();
                  }}>
                    {row.status === "NEW" ? <CheckCircle2 size={16} /> : <RotateCcw size={16} />}
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button size="sm" variant="light" color="danger" isIconOnly aria-label={t("delete")} onPress={() => setDeleting(row.id)}>
                    <Trash2 size={16} />
                  </Button>
                ) : null}
              </div>
              {row.attachments.length ? (
                <ul className="mt-3 flex flex-col gap-1 border-t border-default-100 pt-2">
                  {row.attachments.map((attachment) => (
                    <li key={attachment.id} className="flex flex-wrap items-center gap-2 text-small">
                      <a href={`/api/mail/inbox/attachment?id=${attachment.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Download size={14} /> {attachment.fileName}
                      </a>
                      <span className="text-tiny text-default-400">{format.number(attachment.size / 1024, { maximumFractionDigits: 0 })} KB</span>
                      {attachment.importedTo ? (
                        <Chip size="sm" variant="flat" color="success">
                          {t("importedChip")}
                        </Chip>
                      ) : canManage && accountingUsable ? (
                        <Button size="sm" variant="flat" color="primary" isLoading={busy === attachment.id} onPress={() => importAttachment(attachment.id)}>
                          {t("importToAccounting")}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        isOpen={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        message={t("deleteText")}
        confirmColor="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const response = await deleteInboxMessageAction({ id: deleting });
          if (!response.ok) return void addToast({ title: response.error, color: "danger" });
          router.refresh();
        }}
      />
    </div>
  );
}
