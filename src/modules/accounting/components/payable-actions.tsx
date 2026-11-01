"use client";

import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Textarea } from "@heroui/react";
import { Ban, HandCoins, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { toCents } from "@/shared/money";

import { cancelPayableAction, deletePayableDraftAction, payPayableAction } from "../actions/payable-actions";
import { selectionKey } from "./bank-import-card";

export function PayableActions({ payable, accounts, can }: { payable: { id: string; status: string; openCents: number }; accounts: Array<{ value: string; label: string }>; can: { create: boolean; delete: boolean } }) {
  const t = useTranslations("accounting.payables.actions");
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const openLabel = (payable.openCents / 100).toFixed(2).replace(".", ",");
  const [amount, setAmount] = useState(openLabel);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accounts[0]?.value ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const amountCents = toCents(amount);
  const fail = (error: string) => addToast({ title: error, color: "danger" });

  return (
    <div className="flex flex-wrap gap-2">
      {payable.status === "OPEN" && can.create ? (
        <>
          <Button as="a" href={`/muhasebe/gelen-faturalar/${payable.id}?duzenle=1`} size="sm" variant="flat" startContent={<Pencil className="h-4 w-4" aria-hidden />}>
            {t("edit")}
          </Button>
          <Button size="sm" color="success" startContent={<HandCoins className="h-4 w-4" aria-hidden />} onPress={() => setPayOpen(true)}>
            {t("pay")}
          </Button>
        </>
      ) : null}
      {payable.status === "DRAFT" && can.delete ? (
        <Button size="sm" variant="light" color="danger" startContent={<Trash2 className="h-4 w-4" aria-hidden />} onPress={() => setDeleteOpen(true)}>
          {t("deleteDraft")}
        </Button>
      ) : null}
      {(payable.status === "OPEN" || payable.status === "PAID") && can.delete ? (
        <Button size="sm" variant="flat" color="danger" startContent={<Ban className="h-4 w-4" aria-hidden />} onPress={() => setCancelOpen(true)}>
          {t("cancel")}
        </Button>
      ) : null}

      <Modal isOpen={payOpen} onOpenChange={setPayOpen}>
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>{t("payTitle")}</ModalHeader>
              <ModalBody>
                <Input label={t("amount")} labelPlacement="outside" value={amount} onValueChange={setAmount} description={t("open", { amount: openLabel })} isRequired />
                <Input type="date" label={t("paidDate")} labelPlacement="outside" value={paidDate} onValueChange={setPaidDate} isRequired />
                <Select label={t("account")} labelPlacement="outside" selectedKeys={accountId ? [accountId] : []} onSelectionChange={(keys) => setAccountId(selectionKey(keys))} isRequired>
                  {accounts.map((account) => (
                    <SelectItem key={account.value}>{account.label}</SelectItem>
                  ))}
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={close}>
                  {t("close")}
                </Button>
                <Button
                  color="success"
                  isLoading={busy}
                  isDisabled={!accountId || !paidDate || amountCents === null || amountCents <= 0 || amountCents > payable.openCents}
                  onPress={async () => {
                    setBusy(true);
                    const result = await payPayableAction({ id: payable.id, amount, paidDate, accountId });
                    setBusy(false);
                    if (!result.ok) return fail(result.error);
                    addToast({ title: t("paid", { number: result.data.bookingNumber }), color: "success" });
                    close();
                    router.refresh();
                  }}
                >
                  {t("pay")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <Modal isOpen={cancelOpen} onOpenChange={setCancelOpen}>
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader>{t("cancelTitle")}</ModalHeader>
              <ModalBody>
                <p className="text-small text-default-500">{t("cancelHelp")}</p>
                <Textarea label={t("reason")} labelPlacement="outside" value={reason} onValueChange={setReason} isRequired />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={close}>
                  {t("close")}
                </Button>
                <Button
                  color="danger"
                  isDisabled={reason.trim().length < 3}
                  isLoading={busy}
                  onPress={async () => {
                    setBusy(true);
                    const result = await cancelPayableAction({ id: payable.id, reason });
                    setBusy(false);
                    if (!result.ok) return fail(result.error);
                    close();
                    router.refresh();
                  }}
                >
                  {t("cancel")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
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
