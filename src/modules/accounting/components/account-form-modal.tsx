"use client";

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, addToast } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { DatePicker } from "@heroui/react";
import { parseDate } from "@internationalized/date";

import type { AccountType } from "@prisma/client";

import { createAccountAction, updateAccountAction } from "../actions/account-actions";
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
  const [type, setType] = useState<AccountType>((account?.type as AccountType) ?? "BANK");
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
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [busy, setBusy] = useState(false);
  const moneySuggestion = SKR_SUGGESTIONS[chart].money.find((item) => item.key === (type === "CASH" ? "cash" : "bank"));

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
        : await createAccountAction({ name, type, openingBalance, openingDate, accountNumber });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("saved"), color: "success" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
      <ModalContent>
        <ModalHeader>{account ? t("edit") : t("new")}</ModalHeader>
        <ModalBody className="gap-4">
          <Input
            label={t("name")}
            labelPlacement="outside"
            value={name}
            onValueChange={setName}
            isRequired
            maxLength={100}
          />
          <Select
            label={t("type")}
            labelPlacement="outside"
            selectedKeys={[type]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0] as AccountType | undefined;
              if (key) setType(key);
            }}
          >
            {TYPES.map((value) => (
              <SelectItem key={value}>{t(`type${value}`)}</SelectItem>
            ))}
          </Select>
          <Input
            label={t("accountNumber")}
            labelPlacement="outside"
            value={accountNumber}
            onValueChange={setAccountNumber}
            inputMode="numeric"
            maxLength={8}
            placeholder={moneySuggestion?.number}
            description={moneySuggestion ? t("accountNumberHint", { chart, number: moneySuggestion.number }) : chart}
          />
          <Input
            label={t("openingBalance")}
            labelPlacement="outside"
            value={openingBalance}
            onValueChange={setOpeningBalance}
            inputMode="decimal"
          />
          <DatePicker
            showMonthAndYearPickers
            label={t("openingDate")}
            labelPlacement="outside"
            granularity="day"
            value={(() => {
              try {
                return parseDate(openingDate);
              } catch {
                return null;
              }
            })()}
            onChange={(value) => setOpeningDate(value ? value.toString() : "")}
            hideTimeZone
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button color="primary" onPress={submit} isLoading={busy} isDisabled={name.trim().length < 2}>
            {account ? t("edit") : t("new")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
