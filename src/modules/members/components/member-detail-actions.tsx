"use client";

import { notify } from "@/shared/components/ui/notify";
import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { PdfSplitButton } from "@/shared/components/ui/pdf-split-button";

import type { MemberStatus } from "@prisma/client";

import { deleteMemberAction } from "../actions/delete-member";
import { StatusChangeMenu } from "./status-change-menu";
import { TextLink as ActionLink, buttonClassName, Button } from "@/shared/components/kit";

/**
 * Detay sayfası aksiyon kümesi: Belge PDF / Düzenle / Durum değiştir / Sil.
 * Butonlar yetkiye göre gösterilir; güvenlik sunucuda sağlanır.
 */
export function MemberDetailActions({
  memberId,
  joinDate,
  membershipNumber,
  status,
  canUpdate,
  canDelete,
}: {
  memberId: string;
  /** "yyyy-MM-dd" — ayrılış tarihi bundan önce olamaz. */
  joinDate: string;
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
      notify.error(result.error);
      return;
    }
    notify.success(t("deleteConfirm.successToast", { membershipNumber }));
    router.push("/uyeler");
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PdfSplitButton
          buildHref={(lang) =>
            `/api/members/${memberId}/certificate-pdf?lang=${lang}`
          }
          label={t("actions.certificatePdf")}
          aria={t("actions.certificatePdfAria")}
        />
        {canUpdate ? (
          <ActionLink
            href={`/uyeler/${memberId}?duzenle`}
            className={buttonClassName({
              variant: actionVariant("primary", "solid"),
              size: "sm",
            })}
          >
            {<Pencil className="h-4 w-4" aria-hidden />}
            {t("actions.edit")}
          </ActionLink>
        ) : null}
        {canUpdate ? (
          <StatusChangeMenu
            memberId={memberId}
            current={status}
            joinDate={joinDate}
          />
        ) : null}
        {canDelete ? (
          <Button
            size="sm"
            onPress={() => setConfirmOpen(true)}
            variant={actionVariant("danger", "flat")}
          >
            {<Trash2 className="h-4 w-4" aria-hidden />}
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
