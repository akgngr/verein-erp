"use client";
import { Button, toast } from "@heroui/react";
import { DateInput, Description, Dialog, Input, Label, Select, Spinner, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";


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
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} size="md" className={"w-full max-w-md "}>
            <DialogDismissButton />

            <Dialog.Header>
              <Dialog.Heading className="flex items-center gap-2">
                {account ? t("edit") : t("new")}
              </Dialog.Heading>
            </Dialog.Header>
            <Dialog.Body className="gap-4">
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
                    {TYPES.map((value) => (
                      <Select.Item
                        key={value}
                        id={value}
                        textValue={String(t(`type${value}`))}
                      >
                        <Label>{t(`type${value}`)}</Label>
                      </Select.Item>
                    ))}
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
              <DateInput label={t("openingDate")} ariaLabel={String(t("openingDate"))} value={openingDate} onChange={setOpeningDate} />
            </Dialog.Body>
            <Dialog.Footer>
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
                {busy ? <Spinner size="sm" tone="current" /> : null}
                {account ? t("edit") : t("new")}
              </Button>
            </Dialog.Footer>
    </Dialog>
  );
}
