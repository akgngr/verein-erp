"use client";

import { notify } from "@/shared/components/ui/notify";import { Link as ActionLink, buttonVariants, Button } from "@heroui/react";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { deleteDocumentAction } from "../actions/delete-document";
import { StatusChangeMenu } from "./status-change-menu";

/**
 * Detay sayfası aksiyon kümesi (8.3): Düzenle / Durum değiştir / Sil.
 * Butonlar yetkiye göre gösterilir; güvenlik sunucuda sağlanır.
 */
export function DocumentDetailActions({
  documentId,
  registryNumber,
  status,
  canUpdate,
  canDelete,
}: {
  documentId: string;
  registryNumber: string;
  status: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("documents.list");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirmDelete = async () => {
    const result = await deleteDocumentAction({ id: documentId });
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(t("deletedToast", { registryNumber }));
    router.push("/evrak");
    router.refresh();
  };

  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canUpdate ? (
          <ActionLink
            href={`/evrak/${documentId}?duzenle`}
            className={buttonVariants({
              variant: actionVariant("primary", "solid"),
              size: "sm",
            })}
          >
            {<Pencil className="h-4 w-4" aria-hidden />}
            {t("edit")}
          </ActionLink>
        ) : null}
        {canUpdate ? (
          <StatusChangeMenu documentId={documentId} current={status as never} />
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            onPress={() => setConfirmOpen(true)}
            variant={actionVariant("danger", "flat")}
          >
            {<Trash2 className="h-4 w-4" aria-hidden />}
            {t("delete")}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("deleteTitle")}
        message={t("deleteMessage", { registryNumber })}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}
