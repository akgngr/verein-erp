"use client";

import { useTranslations } from "next-intl";

import { Button, addToast } from "@heroui/react";
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
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("deletedToast", { registryNumber }), color: "success" });
    router.push("/evrak");
    router.refresh();
  };

  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canUpdate ? (
          <Button
            as="a"
            href={`/evrak/${documentId}?duzenle`}
            size="sm"
            color="primary"
            variant="solid"
            startContent={<Pencil className="h-4 w-4" aria-hidden />}
          >
            {t("edit")}
          </Button>
        ) : null}
        {canUpdate ? (
          <StatusChangeMenu documentId={documentId} current={status as never} />
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            startContent={<Trash2 className="h-4 w-4" aria-hidden />}
            onPress={() => setConfirmOpen(true)}
          >
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
