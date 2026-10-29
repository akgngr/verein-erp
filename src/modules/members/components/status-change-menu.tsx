"use client";

import {
  Button,
  DatePicker,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { MemberStatus } from "@prisma/client";

import { changeMemberStatusAction } from "../actions/change-status";
import { MEMBER_STATUS_VALUES } from "../constants";
import { berlinToday } from "../utils";

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
}: {
  memberId: string;
  current: MemberStatus;
}) {
  const router = useRouter();
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const [pendingExitStatus, setPendingExitStatus] = useState<MemberStatus | null>(null);
  const [exitDate, setExitDate] = useState<string>(berlinToday().toISOString().slice(0, 10));
  const [exitReason, setExitReason] = useState("");
  // Faz 4 (4.6): fesih bildirimi tarihi — yalnızca RESIGNED modalında gösterilir.
  const [cancellationReceivedAt, setCancellationReceivedAt] = useState<string>("");
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
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("statusChange.updatedToast", { status: t(`status.${status}`) }), color: "success" });
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

  const parse = (value: string) => {
    if (!value) return null;
    try {
      return parseDate(value);
    } catch {
      return null;
    }
  };

  return (
    <>
      <Dropdown>
        <DropdownTrigger>
          <Button
            size="sm"
            variant="bordered"
            isDisabled={busy}
            startContent={<RefreshCw className="h-4 w-4" aria-hidden />}
            endContent={<ChevronDown className="h-4 w-4" aria-hidden />}
          >
            {t("actions.changeStatus")}
          </Button>
        </DropdownTrigger>
        <DropdownMenu aria-label={t("actions.changeStatus")} disabledKeys={[current]}>
          {MEMBER_STATUS_VALUES.map((status) => (
            <DropdownItem
              key={status}
              textValue={t(`status.${status}`)}
              description={status === current ? t("actions.currentStatus") : undefined}
              onPress={() => handlePick(status)}
            >
              {t(`status.${status}`)}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>

      <Modal
        isOpen={pendingExitStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingExitStatus(null);
            setError(null);
          }
        }}
      >
        <ModalContent>
          <ModalHeader>
            {pendingExitStatus === "RESIGNED" ? t("statusChange.resignedTitle") : t("statusChange.deceasedTitle")}
          </ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <DatePicker
              label={t("statusChange.exitDateLabel")}
              labelPlacement="outside"
              granularity="day"
              value={parse(exitDate)}
              onChange={(value) => setExitDate(value ? value.toString() : "")}
              hideTimeZone
              isRequired
            />
            <Input
              label={t("statusChange.exitReasonLabel")}
              labelPlacement="outside"
              placeholder={t("statusChange.exitReasonPlaceholder")}
              value={exitReason}
              onValueChange={setExitReason}
              maxLength={500}
            />
            {pendingExitStatus === "RESIGNED" ? (
              <DatePicker
                label={t("statusMenu.cancellationReceivedAtLabel")}
                labelPlacement="outside"
                description={t("statusMenu.cancellationReceivedAtHint")}
                granularity="day"
                value={parse(cancellationReceivedAt)}
                onChange={(value) => setCancellationReceivedAt(value ? value.toString() : "")}
                hideTimeZone
              />
            ) : null}
            {error ? <p className="text-small text-danger-600">{error}</p> : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setPendingExitStatus(null)}>
              {tCommon("cancel")}
            </Button>
            <Button color="primary" isLoading={busy} onPress={() => void confirmExit()}>
              {t("statusChange.confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
