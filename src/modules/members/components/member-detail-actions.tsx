"use client";

import { Button, addToast } from "@heroui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import type { MemberStatus } from "@prisma/client";

import { deleteMemberAction } from "../actions/delete-member";
import { StatusChangeMenu } from "./status-change-menu";

/**
 * Detay sayfası aksiyon kümesi: Düzenle / Durum değiştir / Sil.
 * Butonlar yetkiye göre gösterilir; güvenlik sunucuda sağlanır.
 */
export function MemberDetailActions({
  memberId,
  membershipNumber,
  status,
  canUpdate,
  canDelete,
}: {
  memberId: string;
  membershipNumber: string;
  status: MemberStatus;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("members");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirmDelete = async () => {
    const result = await deleteMemberAction({ id: memberId });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("deleteConfirm.successToast", { membershipNumber }), color: "success" });
    router.push("/uyeler");
    router.refresh();
  };

  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canUpdate ? (
          <Button
            as="a"
            href={`/uyeler/${memberId}?duzenle`}
            size="sm"
            color="primary"
            variant="solid"
            startContent={<Pencil className="h-4 w-4" aria-hidden />}
          >
            {t("actions.edit")}
          </Button>
        ) : null}
        {canUpdate ? (
          <StatusChangeMenu memberId={memberId} current={status} />
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            startContent={<Trash2 className="h-4 w-4" aria-hidden />}
            onPress={() => setConfirmOpen(true)}
          >
            {t("actions.delete")}
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("deleteConfirm.title")}
        message={t("deleteConfirm.message", { membershipNumber })}
        confirmLabel={t("deleteConfirm.confirm")}
        confirmColor="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
}
