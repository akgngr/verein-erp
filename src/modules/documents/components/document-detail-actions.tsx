"use client";

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
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirmDelete = async () => {
    const result = await deleteDocumentAction({ id: documentId });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: `Evrak silindi: ${registryNumber}`, color: "success" });
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
            href={`/evrak/${documentId}/duzenle`}
            size="sm"
            color="primary"
            variant="solid"
            startContent={<Pencil className="h-4 w-4" aria-hidden />}
          >
            Düzenle
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
            Sil
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Evrağı sil"
        message={`"${registryNumber}" numaralı evrak kaydı silinecek. Silinen evrak listelerde, aramada, istatistikte ve Excel dışa aktarımda görünmez; kayıt numarası yeniden kullanılmaz. Onaylıyor musunuz?`}
        confirmLabel="Sil"
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}
