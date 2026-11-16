"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import { toast, Button, Spinner, Chip } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import {
  CheckCircle2,
  Download,
  FileUp,
  Inbox,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  deleteInboxMessageAction,
  fetchInboxAction,
  importAttachmentAction,
  setInboxStatusAction,
} from "../actions/inbox-actions";

export type InboxRow = {
  id: string;
  source: string;
  fromAddress: string | null;
  fromName: string | null;
  subject: string;
  receivedAt: string;
  snippet: string | null;
  status: "NEW" | "DONE";
  attachments: {
    id: string;
    fileName: string;
    size: number;
    importedTo: string | null;
  }[];
};

/** Gelen kutusu: IMAP'ten al, .eml yükle, ekleri muhasebeye aktar. */
export function InboxPanel({
  rows,
  imapConfigured,
  accountingUsable,
  canManage,
  canDelete,
  filter,
}: {
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
    if (!response.ok) return void toast(response.error, { variant: "danger" });
    toast(t("fetched", response.data), { variant: "success" });
    router.refresh();
  };

  const uploadEml = async (file: File) => {
    setBusy("eml");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/mail/inbox/eml", {
      method: "POST",
      body,
    });
    const json = (await response.json()) as {
      ok: boolean;
      error?: string;
      created?: boolean;
      attachments?: number;
    };
    setBusy(null);
    if (!json.ok)
      return void toast(json.error ?? t("errors.emlInvalid"), {
        variant: "danger",
      });
    toast(
      json.created
        ? t("emlImported", { attachments: json.attachments ?? 0 })
        : t("emlDuplicate"),
      { variant: statusTone(json.created ? "success" : "warning") },
    );
    router.refresh();
  };

  const importAttachment = async (id: string) => {
    setBusy(id);
    const response = await importAttachmentAction({ id });
    setBusy(null);
    if (!response.ok) return void toast(response.error, { variant: "danger" });
    toast(response.data.duplicate ? t("importDuplicate") : t("imported"), {
      variant: statusTone(response.data.duplicate ? "warning" : "success"),
    });
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
            <Button
              isDisabled={!imapConfigured}
              onPress={fetchNow}
              variant={actionVariant("primary", "solid")}
              isPending={busy === "fetch"}
            >
              {busy === "fetch" ? <Spinner size="sm" color="current" /> : null}
              {<Inbox size={16} />}
              {t("fetch")}
            </Button>
            <Button
              onPress={() => fileInput.current?.click()}
              variant={actionVariant("default", "flat")}
              isPending={busy === "eml"}
            >
              {busy === "eml" ? <Spinner size="sm" color="current" /> : null}
              {<FileUp size={16} />}
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
            <Button
              key={key}
              size="sm"
              onPress={() => router.push(`/mail/gelen-kutusu?durum=${key}`)}
              variant={actionVariant(
                filter === key ? "primary" : "default",
                filter === key ? "solid" : "light",
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      {!accountingUsable ? (
        <p className="text-sm text-warning-600">{t("accountingOff")}</p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-ink-200 bg-surface p-4"
            >
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {row.subject || t("noSubject")}
                  </div>
                  <div className="text-xs text-ink-500">
                    {[row.fromName, row.fromAddress]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    ·{" "}
                    {format.dateTime(new Date(row.receivedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {row.source}
                  </div>
                  {row.snippet ? (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-600">
                      {row.snippet}
                    </p>
                  ) : null}
                </div>
                <Chip
                  size="sm"
                  color={statusTone(
                    row.status === "NEW" ? "warning" : "success",
                  )}
                  variant={"soft"}
                  style={statusStyle(
                    row.status === "NEW" ? "warning" : "success",
                  )}
                >
                  {t(`status.${row.status}`)}
                </Chip>
                {canManage ? (
                  <Button
                    size="sm"
                    isIconOnly
                    aria-label={
                      row.status === "NEW" ? t("markDone") : t("markNew")
                    }
                    onPress={async () => {
                      const response = await setInboxStatusAction({
                        id: row.id,
                        status: row.status === "NEW" ? "DONE" : "NEW",
                      });
                      if (response.ok) router.refresh();
                    }}
                    variant={actionVariant("default", "light")}
                  >
                    {row.status === "NEW" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <RotateCcw size={16} />
                    )}
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    size="sm"
                    isIconOnly
                    aria-label={t("delete")}
                    onPress={() => setDeleting(row.id)}
                    variant={actionVariant("danger", "light")}
                  >
                    <Trash2 size={16} />
                  </Button>
                ) : null}
              </div>
              {row.attachments.length ? (
                <ul className="mt-3 flex flex-col gap-1 border-t border-ink-100 pt-2">
                  {row.attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <a
                        href={`/api/mail/inbox/attachment?id=${attachment.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        <Download size={14} /> {attachment.fileName}
                      </a>
                      <span className="text-xs text-ink-400">
                        {format.number(attachment.size / 1024, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        KB
                      </span>
                      {attachment.importedTo ? (
                        <Chip size="sm" color={"success"} variant={"soft"}>
                          {t("importedChip")}
                        </Chip>
                      ) : canManage && accountingUsable ? (
                        <Button
                          size="sm"
                          onPress={() => importAttachment(attachment.id)}
                          variant={actionVariant("primary", "flat")}
                          isPending={busy === attachment.id}
                        >
                          {busy === attachment.id ? (
                            <Spinner size="sm" color="current" />
                          ) : null}
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
          if (!response.ok)
            return void toast(response.error, { variant: "danger" });
          router.refresh();
        }}
      />
    </div>
  );
}
