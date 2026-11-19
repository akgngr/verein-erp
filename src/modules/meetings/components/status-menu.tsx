"use client";

import { notify } from "@/shared/components/ui/notify";
import { Dialog, Dropdown, Label, Spinner, TextArea, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useTranslations } from "next-intl";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const transitions = (
    Object.entries(MEETING_STATUS_TRANSITIONS[status] ?? {}) as [
      MeetingStatus,
      "update" | "approve",
    ][]
  ).filter(([, required]) => (required === "approve" ? canApprove : canUpdate));

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
    notify.success(t("updatedToast", { label: tStatus(target) }));
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
        <Button variant={actionVariant("default", "flat")}>
          {t("button")}
        </Button>

        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label={t("changeTitle")}
            onAction={(key) => onTransitionClick(key as MeetingStatus)}
          >
            {transitions.map(([target]) => (
              <Dropdown.Item
                key={target}
                id={target}
                textValue={String(tStatus(target))}
              >
                <Label>{tStatus(target)}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
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
      <Dialog
        isOpen={reopenOpen}
        onOpenChange={(open) => !open && setReopenOpen(false)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("reopenModalTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                <p className="text-sm text-ink-600">{t("reopenModalInfo")}</p>
                <TextField
                  value={reason}
                  isRequired
                  onChange={setReason}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("reasonShort")}</Label>
                  <TextArea
                    rows={3}
                    className={["[field-sizing:content]"]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </TextField>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => {
                    setReopenOpen(false);
                    setError(null);
                  }}
                  variant={actionVariant("default", "light")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  onPress={() => submit("HELD", reason)}
                  isDisabled={reason.trim().length < 5}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {t("reopenConfirm")}
                </Button>
              </Dialog.Footer>
      </Dialog>
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
    <Dialog isOpen={isOpen} onOpenChange={(open) => !open && onCancel()} size="md" className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {title}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body>
              <p className="text-sm">{message}</p>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                onPress={onCancel}
                variant={actionVariant("default", "light")}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onPress={onConfirm}
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {confirmLabel}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
