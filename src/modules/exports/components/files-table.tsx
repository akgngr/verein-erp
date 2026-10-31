"use client";

import { addToast, Button, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Download, FolderDown, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { EmptyState } from "@/shared/components/ui/empty-state";
import type { ActionResult } from "@/shared/types/action";

type FileRow = { id: string; title: string; format: string; sizeBytes: number; source: string; createdAt: string; expiresAt: string; url: string };

const size = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export function FilesTable({ files, deleteAction }: { files: FileRow[]; deleteAction: (input: unknown) => Promise<ActionResult> }) {
  const t = useTranslations("exports");
  const tRoot = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const [pending, setPending] = useState<FileRow | null>(null);

  if (!files.length) return <EmptyState icon={FolderDown} title={t("empty")} description={t("emptyHint")} />;

  const sourceLabel = (source: string) => (source === "ai" ? t("sources.ai") : tRoot.has(`${source}.module.label`) ? tRoot(`${source}.module.label`) : source);

  const remove = async () => {
    if (!pending) return;
    const result = await deleteAction({ id: pending.id });
    setPending(null);
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("deleted"), color: "success" });
    router.refresh();
  };

  return (
    <>
      <Table aria-label={t("title")} removeWrapper>
        <TableHeader>
          <TableColumn>{t("columns.title")}</TableColumn>
          <TableColumn>{t("columns.format")}</TableColumn>
          <TableColumn>{t("columns.source")}</TableColumn>
          <TableColumn>{t("columns.size")}</TableColumn>
          <TableColumn>{t("columns.created")}</TableColumn>
          <TableColumn>{t("columns.expires")}</TableColumn>
          <TableColumn align="end">{t("columns.actions")}</TableColumn>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-medium">{file.title}</TableCell>
              <TableCell>
                <Chip size="sm" variant="flat" color="primary">
                  {file.format.toUpperCase()}
                </Chip>
              </TableCell>
              <TableCell>{sourceLabel(file.source)}</TableCell>
              <TableCell>{size(file.sizeBytes)}</TableCell>
              <TableCell>{format.dateTime(new Date(file.createdAt), { dateStyle: "short", timeStyle: "short" })}</TableCell>
              <TableCell>{format.dateTime(new Date(file.expiresAt), { dateStyle: "short" })}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button as="a" href={file.url} size="sm" variant="flat" color="primary" startContent={<Download className="h-4 w-4" aria-hidden />}>
                    {t("download")}
                  </Button>
                  <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("delete")} onPress={() => setPending(file)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
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
