"use client";

import { notify } from "@/shared/components/ui/notify";
import { StatusChip, Table, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Download, FolderDown, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { EmptyState } from "@/shared/components/ui/empty-state";
import type { ActionResult } from "@/shared/types/action";

type FileRow = {
  id: string;
  title: string;
  format: string;
  sizeBytes: number;
  source: string;
  createdAt: string;
  expiresAt: string;
  url: string;
};

const size = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function FilesTable({
  files,
  deleteAction,
}: {
  files: FileRow[];
  deleteAction: (input: unknown) => Promise<ActionResult>;
}) {
  const t = useTranslations("exports");
  const tRoot = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const [pending, setPending] = useState<FileRow | null>(null);

  if (!files.length)
    return (
      <EmptyState
        icon={FolderDown}
        title={t("empty")}
        description={t("emptyHint")}
      />
    );

  const sourceLabel = (source: string) =>
    source === "ai"
      ? t("sources.ai")
      : tRoot.has(`${source}.module.label`)
        ? tRoot(`${source}.module.label`)
        : source;

  const remove = async () => {
    if (!pending) return;
    const result = await deleteAction({ id: pending.id });
    setPending(null);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t("deleted"));
    router.refresh();
  };

  return (
    <>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={t("title")}>
            <Table.Header>
              <Table.Column isRowHeader id={"column-0"}>
                {t("columns.title")}
              </Table.Column>
              <Table.Column id={"column-1"}>{t("columns.format")}</Table.Column>
              <Table.Column id={"column-2"}>{t("columns.source")}</Table.Column>
              <Table.Column id={"column-3"}>{t("columns.size")}</Table.Column>
              <Table.Column id={"column-4"}>
                {t("columns.created")}
              </Table.Column>
              <Table.Column id={"column-5"}>
                {t("columns.expires")}
              </Table.Column>
              <Table.Column id={"column-6"} className="text-right">
                {t("columns.actions")}
              </Table.Column>
            </Table.Header>
            <Table.Body>
              {files.map((file) => (
                <Table.Row key={file.id} id={file.id}>
                  <Table.Cell className="font-medium">{file.title}</Table.Cell>
                  <Table.Cell>
                    <StatusChip tone="primary">
                      {file.format.toUpperCase()}
                    </StatusChip>
                  </Table.Cell>
                  <Table.Cell>{sourceLabel(file.source)}</Table.Cell>
                  <Table.Cell>{size(file.sizeBytes)}</Table.Cell>
                  <Table.Cell>
                    {format.dateTime(new Date(file.createdAt), {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </Table.Cell>
                  <Table.Cell>
                    {format.dateTime(new Date(file.expiresAt), {
                      dateStyle: "short",
                    })}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-1">
                      <ActionLink
                        href={file.url}
                        className={buttonClassName({
                          variant: actionVariant("primary", "flat"),
                          size: "sm",
                        })}
                      >
                        {<Download className="h-4 w-4" aria-hidden />}
                        {t("download")}
                      </ActionLink>
                      <Button
                        isIconOnly
                        size="sm"
                        aria-label={t("delete")}
                        onPress={() => setPending(file)}
                        variant={actionVariant("danger", "light")}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      <ConfirmDialog
        isOpen={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={t("deleteTitle")}
        message={t("deleteMessage", { title: pending?.title ?? "" })}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={remove}
      />
    </>
  );
}
