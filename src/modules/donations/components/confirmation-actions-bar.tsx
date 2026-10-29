"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea, addToast } from "@heroui/react";
import { Ban, FileDown, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cancelConfirmationAction, reissueConfirmationAction } from "../actions/confirmation-actions";

/**
 * Bildirim detayı eylemleri (§ 15 md. 7): PDF, iptal (neden 5-300) ve iptal
 * edilmiş bildirim için "Yerine yenisini oluştur".
 */
export function ConfirmationActionsBar({
  id,
  confirmationNumber,
  canCancel,
  canReissue,
}: {
  id: string;
  confirmationNumber: string;
  canCancel: boolean;
  canReissue: boolean;
}) {
  const t = useTranslations("donations.confirmations");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    setBusy(true);
    try {
      const result = await cancelConfirmationAction({ id, reason });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("detail.cancelled"), color: "success" });
      setCancelOpen(false);
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const reissue = async () => {
    setBusy(true);
    try {
      const result = await reissueConfirmationAction({ id });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("detail.reissued", { number: result.data.confirmationNumber }), color: "success" });
      router.push(`/bagislar/bildirimler/${result.data.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        as="a"
        href={`/api/donations/confirmations/${id}/pdf`}
        target="_blank"
        rel="noopener"
        size="sm"
        variant="bordered"
        color="primary"
        startContent={<FileDown className="h-4 w-4" aria-hidden />}
      >
        {t("actions.pdf")}
      </Button>
      {canReissue ? (
        <Button
          size="sm"
          color="primary"
          isLoading={busy}
          startContent={busy ? null : <RefreshCcw className="h-4 w-4" aria-hidden />}
          onPress={reissue}
        >
          {t("actions.replace")}
        </Button>
      ) : null}
      {canCancel ? (
        <Button
          size="sm"
          variant="flat"
          color="danger"
          startContent={<Ban className="h-4 w-4" aria-hidden />}
          onPress={() => setCancelOpen(true)}
        >
          {t("actions.cancel")}
        </Button>
      ) : null}

      <Modal isOpen={cancelOpen} onOpenChange={setCancelOpen} size="md">
        <ModalContent>
          <ModalHeader>
            {t("cancelTitle")} — {confirmationNumber}
          </ModalHeader>
          <ModalBody>
            <p className="text-small text-default-500">{t("cancelHint")}</p>
            <Textarea
              label={t("cancelReason")}
              labelPlacement="outside"
              value={reason}
              onValueChange={setReason}
              maxLength={300}
              minRows={3}
              isRequired
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setCancelOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button color="danger" onPress={cancel} isLoading={busy} isDisabled={reason.trim().length < 5}>
              {t("actions.cancel")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
