"use client";

import { notify } from "@/shared/components/ui/notify";
import { DateInput, Description, Dialog, Input, Label, Select, Spinner, TextArea, TextField, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Ban, HandCoins, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { toCents } from "@/shared/money";

import {
  cancelPayableAction,
  deletePayableDraftAction,
  payPayableAction,
} from "../actions/payable-actions";

export function PayableActions({
  payable,
  accounts,
  can,
}: {
  payable: { id: string; status: string; openCents: number };
  accounts: Array<{ value: string; label: string }>;
  can: { create: boolean; delete: boolean };
}) {
  const t = useTranslations("accounting.payables.actions");
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const openLabel = (payable.openCents / 100).toFixed(2).replace(".", ",");
  const [amount, setAmount] = useState(openLabel);
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [accountId, setAccountId] = useState(accounts[0]?.value ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const amountCents = toCents(amount);
  const fail = (error: string) => notify.error(error);

  return (
    <div className="flex flex-wrap gap-2">
      {payable.status === "OPEN" && can.create ? (
        <>
          <ActionLink
            href={`/muhasebe/gelen-faturalar/${payable.id}?duzenle=1`}
            className={buttonClassName({
              variant: actionVariant("default", "flat"),
              size: "sm",
            })}
          >
            {<Pencil className="h-4 w-4" aria-hidden />}
            {t("edit")}
          </ActionLink>
          <Button
            size="sm"
            onPress={() => setPayOpen(true)}
            variant={actionVariant("success", "solid")}
          >
            {<HandCoins className="h-4 w-4" aria-hidden />}
            {t("pay")}
          </Button>
        </>
      ) : null}
      {payable.status === "DRAFT" && can.delete ? (
        <Button
          size="sm"
          onPress={() => setDeleteOpen(true)}
          variant={actionVariant("danger", "light")}
        >
          {<Trash2 className="h-4 w-4" aria-hidden />}
          {t("deleteDraft")}
        </Button>
      ) : null}
      {(payable.status === "OPEN" || payable.status === "PAID") &&
      can.delete ? (
        <Button
          size="sm"
          onPress={() => setCancelOpen(true)}
          variant={actionVariant("danger", "flat")}
        >
          {<Ban className="h-4 w-4" aria-hidden />}
          {t("cancel")}
        </Button>
      ) : null}

      <Dialog isOpen={payOpen} onOpenChange={setPayOpen} size="md" className={"w-full max-w-md "}>
              {({ close: close }) => (
                <>
                  <DialogDismissButton />
                  <Dialog.Header>
                    <Dialog.Heading className="flex items-center gap-2">
                      {t("payTitle")}
                    </Dialog.Heading>
                  </Dialog.Header>
                  <Dialog.Body>
                    <TextField
                      value={amount}
                      isRequired
                      onChange={setAmount}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("amount")}</Label>
                      <Input />
                      <Description>
                        {t("open", { amount: openLabel })}
                      </Description>
                    </TextField>
                    <DateInput
                      label={t("paidDate")}
                      ariaLabel={t("paidDate")}
                      value={paidDate}
                      onChange={setPaidDate}
                      isRequired
                      className="w-full"
                    />
                    <Select
                      isRequired
                      value={accountId ? accountId : null}
                      onChange={(selectedValue) => {
                        const keys =
                          selectedValue === null
                            ? undefined
                            : String(selectedValue);
                        return setAccountId(String(keys ?? ""));
                      }}
                    >
                      <Label>{t("account")}</Label>
                          {accounts.map((account) => (
                            <Select.Item
                              key={account.value}
                              id={account.value}
                              textValue={String(account.label)}
                            >
                              <Label>{account.label}</Label>
                            </Select.Item>
                          ))}
                    </Select>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Button
                      onPress={close}
                      variant={actionVariant("default", "light")}
                    >
                      {t("close")}
                    </Button>
                    <Button
                      isDisabled={
                        !accountId ||
                        !paidDate ||
                        amountCents === null ||
                        amountCents <= 0 ||
                        amountCents > payable.openCents
                      }
                      onPress={async () => {
                        setBusy(true);
                        const result = await payPayableAction({
                          id: payable.id,
                          amount,
                          paidDate,
                          accountId,
                        });
                        setBusy(false);
                        if (!result.ok) return fail(result.error);
                        notify.success(
                          t("paid", { number: result.data.bookingNumber }));
                        close();
                        router.refresh();
                      }}
                      variant={actionVariant("success", "solid")}
                      isPending={busy}
                    >
                      {busy ? <Spinner size="sm" tone="current" /> : null}
                      {t("pay")}
                    </Button>
                  </Dialog.Footer>
                </>
              )}
      </Dialog>
      <Dialog isOpen={cancelOpen} onOpenChange={setCancelOpen} size="md" className={"w-full max-w-md "}>
              {({ close: close }) => (
                <>
                  <DialogDismissButton />
                  <Dialog.Header>
                    <Dialog.Heading className="flex items-center gap-2">
                      {t("cancelTitle")}
                    </Dialog.Heading>
                  </Dialog.Header>
                  <Dialog.Body>
                    <p className="text-sm text-ink-500">{t("cancelHelp")}</p>
                    <TextField
                      value={reason}
                      isRequired
                      onChange={setReason}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("reason")}</Label>
                      <TextArea
                        rows={3}
                        className={["[field-sizing:content]"]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    </TextField>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Button
                      onPress={close}
                      variant={actionVariant("default", "light")}
                    >
                      {t("close")}
                    </Button>
                    <Button
                      isDisabled={reason.trim().length < 3}
                      onPress={async () => {
                        setBusy(true);
                        const result = await cancelPayableAction({
                          id: payable.id,
                          reason,
                        });
                        setBusy(false);
                        if (!result.ok) return fail(result.error);
                        close();
                        router.refresh();
                      }}
                      variant={actionVariant("danger", "solid")}
                      isPending={busy}
                    >
                      {busy ? <Spinner size="sm" tone="current" /> : null}
                      {t("cancel")}
                    </Button>
                  </Dialog.Footer>
                </>
              )}
      </Dialog>
      <ConfirmDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteDraft")}
        message={t("deleteConfirm")}
        confirmLabel={t("deleteDraft")}
        confirmColor="danger"
        onConfirm={async () => {
          const result = await deletePayableDraftAction({ id: payable.id });
          if (!result.ok) {
            fail(result.error);
            return;
          }
          router.push("/muhasebe/gelen-faturalar");
          router.refresh();
        }}
      />
    </div>
  );
}
