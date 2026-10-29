"use client";

import { useTranslations } from "next-intl";

import { addToast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";

import { changeMeetingStatusAction } from "../actions/change-status";
import { MEETING_STATUS_TRANSITIONS } from "../constants";
import type { MeetingStatus } from "@prisma/client";

/**
 * Durum menüsü (7.3): yalnızca kullanıcının gerçekleştirebileceği geçişler
 * gösterilir. Onaylama onay penceresiyle; yeniden açma gerekçe metin alanı
 * ister (5. bölüm md. 3). Yeter sayısı sağlanmamışsa onay uyarısı gösterilir.
 */
export function StatusMenu({
  meetingId,
  meetingNumber,
  status,
  canUpdate,
  canApprove,
  quorumReached,
  quorumRequired,
}: {
  meetingId: string;
  meetingNumber: string;
  status: MeetingStatus;
  canUpdate: boolean;
  canApprove: boolean;
  quorumReached: boolean | null;
  quorumRequired: number | null;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("meetings.statusMenu");
  const tStatus = useTranslations("meetings.status");
  const router = useRouter();
  const [pending, setPending] = useState<MeetingStatus | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // KARAR: menü yalnızca izne ve geçiş haritasına düşen hedefleri listeler;
  // sunucu yine de her geçişi yeniden denetler (5. bölüm md. 3).
  const transitions = (Object.entries(MEETING_STATUS_TRANSITIONS[status] ?? {}) as [
    MeetingStatus,
    "update" | "approve",
  ][]).filter(([, required]) => (required === "approve" ? canApprove : canUpdate));

  if (transitions.length === 0) return null;

  const confirmDialogMessage = (target: MeetingStatus): string => {
    if (target === "APPROVED") {
      if (quorumRequired !== null && quorumReached === false) {
        return t("confirmApproveNoQuorum");
      }
      return t("confirmApprove", { number: meetingNumber });
    }
    // KARAR: HELD hedefi iki farklı geçiştir — onaylıdan yeniden açma ile
    // taslağa alma farklı mesaj alır (5. bölüm md. 3).
    if (target === "HELD" && status === "APPROVED") {
      return t("confirmReopen", { number: meetingNumber });
    }
    if (target === "HELD") {
      return t("confirmHeld", { number: meetingNumber });
    }
    if (target === "CANCELLED") {
      return t("confirmCancel", { number: meetingNumber });
    }
    return t("confirmPlanned", { number: meetingNumber });
  };

  const submit = async (target: MeetingStatus, reasonText: string | null) => {
    setBusy(true);
    setError(null);
    const result = await changeMeetingStatusAction({
      meetingId,
      status: target,
      reason: reasonText,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    addToast({
      title: t("updatedToast", { label: tStatus(target) }),
      color: "success",
    });
    setPending(null);
    setReopenOpen(false);
    setReason("");
    router.refresh();
  };

  const onTransitionClick = (target: MeetingStatus) => {
    if (target === "HELD" && status === "APPROVED") {
      setReopenOpen(true);
      return;
    }
    setPending(target);
  };

  return (
    <>
      <Dropdown>
        <DropdownTrigger>
          <Button variant="flat" color="default">
            {t("button")}
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label={t("changeTitle")} onAction={(key) => onTransitionClick(key as MeetingStatus)}>
          {transitions.map(([target]) => (
            <DropdownItem key={target}>{tStatus(target)}</DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>

      <ConfirmStatusDialog
        isOpen={pending !== null}
        title={t("changeTitle")}
        message={pending ? confirmDialogMessage(pending) : ""}
        confirmLabel={t("approveConfirm")}
        busy={busy}
        error={error}
        onCancel={() => {
          setPending(null);
          setError(null);
        }}
        onConfirm={() => pending && submit(pending, null)}
      />

      {/* Yeniden açma: gerekçe zorunlu (5-500 karakter) (5. bölüm md. 3). */}
      <Modal isOpen={reopenOpen} onOpenChange={(open) => !open && setReopenOpen(false)}>
        <ModalContent>
          <ModalHeader>{t("reopenModalTitle")}</ModalHeader>
          <ModalBody>
            <p className="text-small text-default-600">{t("reopenModalInfo")}</p>
            <Textarea
              label={t("reasonShort")}
              labelPlacement="outside"
              value={reason}
              onValueChange={setReason}
              minRows={3}
              isRequired
            />
            {error ? <p className="text-small text-danger">{error}</p> : null}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                setReopenOpen(false);
                setError(null);
              }}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              color="primary"
              isLoading={busy}
              onPress={() => submit("HELD", reason)}
              isDisabled={reason.trim().length < 5}
            >
              {t("reopenConfirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function ConfirmStatusDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const tCommon = useTranslations("common");
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <p className="text-small">{message}</p>
          {error ? <p className="text-small text-danger">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onCancel}>
            {tCommon("cancel")}
          </Button>
          <Button color="primary" isLoading={busy} onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
