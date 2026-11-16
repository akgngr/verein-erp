"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  Input,
  Dropdown,
  Description,
  DatePicker,
  DateField,
} from "@heroui/react";
import { DateCalendar } from "@/shared/components/forms/date-calendar";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { parseDate } from "@internationalized/date";
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
      toast(describeActionError(result), { variant: "danger" });
      return;
    }
    toast(t("statusChange.updatedToast", { status: t(`status.${status}`) }), {
      variant: "success",
    });
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

      <Modal
        isOpen={pendingExitStatus !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingExitStatus(null);
            setError(null);
          }
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {pendingExitStatus === "RESIGNED"
                    ? t("statusChange.resignedTitle")
                    : t("statusChange.deceasedTitle")}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <DatePicker
                  granularity="day"
                  value={parse(exitDate)}
                  onChange={(value) =>
                    setExitDate(value ? value.toString() : "")
                  }
                  minValue={parse(joinDate) ?? undefined}
                  hideTimeZone
                  isRequired
                >
                  <Label>{t("statusChange.exitDateLabel")}</Label>
                  <DateField.Group>
                    <DateField.Input>
                      {(segment) => <DateField.Segment segment={segment} />}
                    </DateField.Input>
                    <DateField.Suffix>
                      <DatePicker.Trigger
                        aria-label={String(t("statusChange.exitDateLabel"))}
                      >
                        <DatePicker.TriggerIndicator />
                      </DatePicker.Trigger>
                    </DateField.Suffix>
                  </DateField.Group>
                  <DatePicker.Popover>
                    <DateCalendar
                      label={String(t("statusChange.exitDateLabel"))}
                      minValue={parse(joinDate) ?? undefined}
                    />
                  </DatePicker.Popover>
                </DatePicker>
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
                  <DatePicker
                    granularity="day"
                    value={parse(cancellationReceivedAt)}
                    onChange={(value) =>
                      setCancellationReceivedAt(value ? value.toString() : "")
                    }
                    hideTimeZone
                  >
                    <Label>{t("statusMenu.cancellationReceivedAtLabel")}</Label>
                    <DateField.Group>
                      <DateField.Input>
                        {(segment) => <DateField.Segment segment={segment} />}
                      </DateField.Input>
                      <DateField.Suffix>
                        <DatePicker.Trigger
                          aria-label={String(
                            t("statusMenu.cancellationReceivedAtLabel"),
                          )}
                        >
                          <DatePicker.TriggerIndicator />
                        </DatePicker.Trigger>
                      </DateField.Suffix>
                    </DateField.Group>
                    <Description>
                      {t("statusMenu.cancellationReceivedAtHint")}
                    </Description>
                    <DatePicker.Popover>
                      <DateCalendar
                        label={String(
                          t("statusMenu.cancellationReceivedAtLabel"),
                        )}
                      />
                    </DatePicker.Popover>
                  </DatePicker>
                ) : null}
                {error ? (
                  <p className="text-sm text-danger-600">{error}</p>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
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
                  {busy ? <Spinner size="sm" color="current" /> : null}
                  {t("statusChange.confirm")}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
