"use client";

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
import { MEETING_STATUS_LABELS, MEETING_STATUS_TRANSITIONS } from "../constants";
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
        return "Toplantı yeter sayısı sağlanmamış. Yine de onaylamak istiyor musunuz?";
      }
      return `"${meetingNumber}" numaralı toplantı tutanağı onaylanacak. Onaydan sonra içerik kilitlenir; düzenlemek için yeniden açmanız gerekir. Onaylıyor musunuz?`;
    }
    // KARAR: HELD hedefi iki farklı geçiştir — onaylıdan yeniden açma ile
    // taslağa alma farklı mesaj alır (5. bölüm md. 3).
    if (target === "HELD" && status === "APPROVED") {
      return `"${meetingNumber}" numaralı tutanak yeniden açılacak ve düzenlenebilir duruma geçecektir. Devam edilsin mi?`;
    }
    if (target === "HELD") {
      return `"${meetingNumber}" numaralı toplantı "Yapıldı" durumuna alınacak (tutanak taslağı). Devam edilsin mi?`;
    }
    if (target === "CANCELLED") {
      return `"${meetingNumber}" numaralı toplantı iptal edilecek. Devam edilsin mi?`;
    }
    return `"${meetingNumber}" numaralı toplantı "Planlandı" durumuna alınacak. Devam edilsin mi?`;
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
      title: `Durum güncellendi: ${MEETING_STATUS_LABELS[target]}`,
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
            Durum
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Durum değişikliği" onAction={(key) => onTransitionClick(key as MeetingStatus)}>
          {transitions.map(([target]) => (
            <DropdownItem key={target}>{MEETING_STATUS_LABELS[target]}</DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>

      <ConfirmStatusDialog
        isOpen={pending !== null}
        title="Durum değişikliği"
        message={pending ? confirmDialogMessage(pending) : ""}
        confirmLabel="Onayla"
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
          <ModalHeader>Tutanak yeniden açma</ModalHeader>
          <ModalBody>
            <p className="text-small text-default-600">
              Tutanağı düzenlemek için yeniden açıyorsunuz. Gerekçe zorunludur ve denetim
              kaydına işlenir.
            </p>
            <Textarea
              label="Gerekçe"
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
              Vazgeç
            </Button>
            <Button
              color="primary"
              isLoading={busy}
              onPress={() => submit("HELD", reason)}
              isDisabled={reason.trim().length < 5}
            >
              Yeniden aç
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
            Vazgeç
          </Button>
          <Button color="primary" isLoading={busy} onPress={onConfirm}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
