"use client";

import { notify } from "@/shared/components/ui/notify";
import { DateInput, Description, Dialog, Dropdown, Input, Label, Spinner, TextField, Button } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { ChevronDown, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { MemberStatus } from "@prisma/client";

import { changeMemberStatusAction } from "../actions/change-status";
import { MEMBER_STATUS_VALUES } from "../constants";
import { berlinToday } from "../utils";
import { describeActionError } from "@/shared/components/forms/action-result";

/**
 * Üye durum değiştirme menüsü.
 *
 * KARAR: RESIGNED/DECEASED durumuna geçişte ek veri (exitDate, exitReason)
 * gerekir — bunun için bir modal açılır. ACTIVE/PASSIVE geçişleri doğrudan
 * action çağırır (exitDate önceki değerinden korunur). Tüm durumlar serbest
 * geçişe izin verir (dernek politikası).
 */
export function StatusChangeMenu({
  memberId,
  current,
  joinDate,
}: {
  memberId: string;
  current: MemberStatus;
  /** "yyyy-MM-dd" — ayrılış tarihi bundan önce olamaz. */
  joinDate: string;
}) {
  const router = useRouter();
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [pendingExitStatus, setPendingExitStatus] =
    useState<MemberStatus | null>(null);
  const [exitDate, setExitDate] = useState<string>(
    berlinToday().toISOString().slice(0, 10),
  );
  const [exitReason, setExitReason] = useState("");
  // Faz 4 (4.6): fesih bildirimi tarihi — yalnızca RESIGNED modalında gösterilir.
  const [cancellationReceivedAt, setCancellationReceivedAt] =
    useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const change = async (
    status: MemberStatus,
    date?: string,
    reason?: string,
    cancellationDate?: string,
  ) => {
    setBusy(true);
    setError(null);
    const result = await changeMemberStatusAction({
      id: memberId,
      status,
      ...(date ? { exitDate: date } : {}),
      ...(reason ? { exitReason: reason } : {}),
      // Faz 4 (4.6): RESIGNED'e geçişte fesih bildirimi tarihi taşınır; başka
      // duruma geçişte action alanı temizler (undefined = dokunma).
      ...(status === "RESIGNED"
        ? { cancellationReceivedAt: cancellationDate || null }
        : {}),
    });
    setBusy(false);
    if (!result.ok) {
      notify.error(describeActionError(result));
      return;
    }
    notify.success(t("statusChange.updatedToast", { status: t(`status.${status}`) }));
    router.refresh();
  };

  const handlePick = (status: MemberStatus) => {
    if (status === current) return;
    if (status === "RESIGNED" || status === "DECEASED") {
      setPendingExitStatus(status);
      return;
    }
    void change(status);
  };

  const confirmExit = async () => {
    if (!pendingExitStatus) return;
    if (!exitDate) {
      setError(t("statusChange.exitDateRequired"));
      return;
    }
    await change(
      pendingExitStatus,
      exitDate,
      exitReason || undefined,
      cancellationReceivedAt || undefined,
    );
    setPendingExitStatus(null);
    setExitReason("");
    setCancellationReceivedAt("");
  };


  return (
    <>
      <Dropdown>
        <Button
          size="sm"
          isDisabled={busy}
          variant={actionVariant("default", "bordered")}
        >
          {<RefreshCw className="h-4 w-4" aria-hidden />}
          {t("actions.changeStatus")}
          {<ChevronDown className="h-4 w-4" aria-hidden />}
        </Button>

        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label={t("actions.changeStatus")}
            disabledKeys={[current]}
          >
            {MEMBER_STATUS_VALUES.map((status) => (
              <Dropdown.Item
                key={status}
                id={status}
                textValue={t(`status.${status}`)}
                onAction={() => handlePick(status)}
              >
                <Label>{t(`status.${status}`)}</Label>
                <Description>
                  {status === current ? t("actions.currentStatus") : undefined}
                </Description>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <Dialog
        isOpen={pendingExitStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingExitStatus(null);
            setError(null);
          }
        }} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {pendingExitStatus === "RESIGNED"
                    ? t("statusChange.resignedTitle")
                    : t("statusChange.deceasedTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body className="flex flex-col gap-4">
                <DateInput label={t("statusChange.exitDateLabel")} ariaLabel={String(t("statusChange.exitDateLabel"))} value={exitDate} onChange={setExitDate} minValue={joinDate} isRequired />
                <TextField
                  value={exitReason}
                  onChange={setExitReason}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("statusChange.exitReasonLabel")}</Label>
                  <Input
                    placeholder={t("statusChange.exitReasonPlaceholder")}
                    maxLength={500}
                  />
                </TextField>
                {pendingExitStatus === "RESIGNED" ? (
                  <DateInput label={t("statusMenu.cancellationReceivedAtLabel")} ariaLabel={String(
                            t("statusMenu.cancellationReceivedAtLabel"),
                          )} value={cancellationReceivedAt} onChange={setCancellationReceivedAt} />
                ) : null}
                {error ? (
                  <p className="text-sm text-danger-600">{error}</p>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setPendingExitStatus(null)}
                  variant={actionVariant("default", "light")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  onPress={() => void confirmExit()}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {t("statusChange.confirm")}
                </Button>
              </Dialog.Footer>
      </Dialog>
    </>
  );
}
