"use client";

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, addToast } from "@heroui/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { DatePicker } from "@heroui/react";
import { parseDate } from "@internationalized/date";

import type { AccountType } from "@prisma/client";

import { createAccountAction, updateAccountAction } from "../actions/account-actions";

const TYPES: AccountType[] = ["CASH", "BANK", "OTHER"];

type AccountRow = {
  id: string;
  name: string;
  type: string;
  openingBalanceCents: number;
  openingDate: Date | string;
  isActive: boolean;
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
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountRow | null;
}) {
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
  const [busy, setBusy] = useState(false);

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
          })
        : await createAccountAction({ name, type, openingBalance, openingDate });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: "✓", color: "success" });
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
            label={t("openingBalance")}
            labelPlacement="outside"
            value={openingBalance}
            onValueChange={setOpeningBalance}
            inputMode="decimal"
          />
          <DatePicker
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
            Vazgeç
          </Button>
          <Button color="primary" onPress={submit} isLoading={busy} isDisabled={name.trim().length < 2}>
            {account ? t("edit") : t("new")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
