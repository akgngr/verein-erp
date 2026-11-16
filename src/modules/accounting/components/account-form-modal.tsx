"use client";
import {
  toast,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  Input,
  Description,
  Select,
  ListBox,
  DatePicker,
  DateField,
} from "@heroui/react";
import { DateCalendar } from "@/shared/components/forms/date-calendar";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { parseDate } from "@internationalized/date";

import type { AccountType } from "@prisma/client";

import {
  createAccountAction,
  updateAccountAction,
} from "../actions/account-actions";
import { SKR_SUGGESTIONS, type ChartOfAccounts } from "../services/skr";

const TYPES: AccountType[] = ["CASH", "BANK", "OTHER"];

type AccountRow = {
  id: string;
  name: string;
  type: string;
  openingBalanceCents: number;
  openingDate: Date | string;
  isActive: boolean;
  accountNumber?: string | null;
};

/**
 * Hesap oluştur/düzenle modalı (§ 11.4): ad, tür, açılış bakiyesi/tarihi.
 * KARAR: Fişi olan hesapta açılış alanları sunucuda reddedilir — form yine de
 * gösterir (hata mesajı net; basitlik).
 */
export function AccountFormModal({
  isOpen,
  onOpenChange,
  account,
  chart = "SKR03",
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountRow | null;
  chart?: ChartOfAccounts;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("accounting.setup.accounts");
  const router = useRouter();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(
    (account?.type as AccountType) ?? "BANK",
  );
  const [openingBalance, setOpeningBalance] = useState(
    account ? (account.openingBalanceCents / 100).toFixed(2) : "0",
  );
  const [openingDate, setOpeningDate] = useState<string>(
    account
      ? typeof account.openingDate === "string"
        ? account.openingDate.slice(0, 10)
        : account.openingDate.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [accountNumber, setAccountNumber] = useState(
    account?.accountNumber ?? "",
  );
  const [busy, setBusy] = useState(false);
  const moneySuggestion = SKR_SUGGESTIONS[chart].money.find(
    (item) => item.key === (type === "CASH" ? "cash" : "bank"),
  );

  const submit = async () => {
    setBusy(true);
    try {
      const result = account
        ? await updateAccountAction({
            id: account.id,
            name,
            type,
            openingBalance,
            openingDate,
            isActive: account.isActive,
            accountNumber,
          })
        : await createAccountAction({
            name,
            type,
            openingBalance,
            openingDate,
            accountNumber,
          });
      if (!result.ok) {
        toast(result.error, { variant: "danger" });
        return;
      }
      toast(t("saved"), { variant: "success" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                {account ? t("edit") : t("new")}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
              <TextField
                value={name}
                isRequired
                onChange={setName}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("name")}</Label>
                <Input maxLength={100} />
              </TextField>
              <Select
                value={type}
                onChange={(selectedValue) => {
                  const keys =
                    selectedValue === null ? undefined : String(selectedValue);
                  const key = keys as AccountType | undefined;
                  if (key) setType(key);
                }}
              >
                <Label>{t("type")}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {TYPES.map((value) => (
                      <ListBox.Item
                        key={value}
                        id={value}
                        textValue={String(t(`type${value}`))}
                      >
                        <Label>{t(`type${value}`)}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <TextField
                value={accountNumber}
                onChange={setAccountNumber}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("accountNumber")}</Label>
                <Input
                  inputMode="numeric"
                  maxLength={8}
                  placeholder={moneySuggestion?.number}
                />
                <Description>
                  {moneySuggestion
                    ? t("accountNumberHint", {
                        chart,
                        number: moneySuggestion.number,
                      })
                    : chart}
                </Description>
              </TextField>
              <TextField
                value={openingBalance}
                onChange={setOpeningBalance}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("openingBalance")}</Label>
                <Input inputMode="decimal" />
              </TextField>
              <DatePicker
                granularity="day"
                value={(() => {
                  try {
                    return parseDate(openingDate);
                  } catch {
                    return null;
                  }
                })()}
                onChange={(value) =>
                  setOpeningDate(value ? value.toString() : "")
                }
                hideTimeZone
              >
                <Label>{t("openingDate")}</Label>
                <DateField.Group>
                  <DateField.Input>
                    {(segment) => <DateField.Segment segment={segment} />}
                  </DateField.Input>
                  <DateField.Suffix>
                    <DatePicker.Trigger aria-label={String(t("openingDate"))}>
                      <DatePicker.TriggerIndicator />
                    </DatePicker.Trigger>
                  </DateField.Suffix>
                </DateField.Group>
                <DatePicker.Popover>
                  <DateCalendar label={String(t("openingDate"))} />
                </DatePicker.Popover>
              </DatePicker>
            </Modal.Body>
            <Modal.Footer>
              <Button
                onPress={() => onOpenChange(false)}
                variant={actionVariant("default", "flat")}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onPress={submit}
                isDisabled={name.trim().length < 2}
                variant={actionVariant("primary", "solid")}
                isPending={busy}
              >
                {busy ? <Spinner size="sm" color="current" /> : null}
                {account ? t("edit") : t("new")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
