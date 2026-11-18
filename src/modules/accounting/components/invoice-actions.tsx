"use client";

import { notify } from "@/shared/components/ui/notify";import { Button, buttonVariants, Link as ActionLink } from "@heroui/react";
import { Checkbox, Description, Dialog, Input, Label, Select, Spinner, TextArea, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  Ban,
  CheckCircle2,
  FileOutput,
  HandCoins,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { toCents } from "@/shared/money";
import { PdfSplitButton } from "@/shared/components/ui/pdf-split-button";

import {
  cancelInvoiceAction,
  convertProformaAction,
  deleteInvoiceDraftAction,
  issueInvoiceAction,
  recordInvoicePaymentAction,
} from "../actions/invoice-actions";

type Option = { value: string; label: string };

/** Fatura detay aksiyonları: PDF, düzenle/kesinleştir/sil (taslak), ödeme al, faturaya dönüştür, iptal. */
export function InvoiceActions({
  invoice,
  can,
  accountOptions,
  categoryOptions,
}: {
  invoice: {
    id: string;
    kind: "INVOICE" | "PROFORMA" | "QUOTE" | "CREDIT_NOTE";
    status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
    number: string | null;
    categoryId: string | null;
    convertedInvoiceId: string | null;
    openCents: number;
  };
  can: { update: boolean; create: boolean; delete: boolean };
  accountOptions: Option[];
  categoryOptions: Option[];
}) {
  const t = useTranslations("accounting.invoices.actions");
  const router = useRouter();
  const [confirm, setConfirm] = useState<"issue" | "delete" | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [accountId, setAccountId] = useState(accountOptions[0]?.value ?? "");
  const [categoryId, setCategoryId] = useState(invoice.categoryId ?? "");
  const [reason, setReason] = useState("");
  const openLabel = (invoice.openCents / 100).toFixed(2).replace(".", ",");
  const [amount, setAmount] = useState(openLabel);
  const [closeRemainder, setCloseRemainder] = useState(false);
  const amountCents = toCents(amount);
  const partial =
    amountCents !== null && amountCents > 0 && amountCents < invoice.openCents;

  const done = (message: string) => {
    notify.success(message);
    router.refresh();
  };
  const fail = (error: string): void => {
    notify.error(error);
  };
  const draft = invoice.status === "DRAFT";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PdfSplitButton
        buildHref={(lang) =>
          `/api/accounting/invoices/${invoice.id}/pdf?lang=${lang}`
        }
        label={draft ? t("previewPdf") : t("pdf")}
        aria={t("pdf")}
      />
      {draft && can.update ? (
        <>
          <ActionLink
            href={`/muhasebe/faturalar/${invoice.id}?duzenle=${invoice.id}`}
            className={buttonVariants({
              variant: actionVariant("default", "flat"),
              size: "sm",
            })}
          >
            {<Pencil className="h-4 w-4" aria-hidden />}
            {t("edit")}
          </ActionLink>
          <Button
            size="sm"
            onPress={() => setConfirm("issue")}
            variant={actionVariant("primary", "solid")}
          >
            {<CheckCircle2 className="h-4 w-4" aria-hidden />}
            {t("issue")}
          </Button>
        </>
      ) : null}
      {draft && can.delete ? (
        <Button
          size="sm"
          onPress={() => setConfirm("delete")}
          variant={actionVariant("danger", "light")}
        >
          {<Trash2 className="h-4 w-4" aria-hidden />}
          {t("deleteDraft")}
        </Button>
      ) : null}
      {invoice.kind === "INVOICE" &&
      invoice.status === "ISSUED" &&
      can.create ? (
        <Button
          size="sm"
          onPress={() => setPaymentOpen(true)}
          variant={actionVariant("success", "solid")}
        >
          {<HandCoins className="h-4 w-4" aria-hidden />}
          {t("recordPayment")}
        </Button>
      ) : null}
      {(invoice.kind === "PROFORMA" || invoice.kind === "QUOTE") &&
      (invoice.status === "ISSUED" || invoice.status === "PAID") &&
      can.create ? (
        invoice.convertedInvoiceId ? (
          <ActionLink
            href={`/muhasebe/faturalar/${invoice.convertedInvoiceId}`}
            className={buttonVariants({
              variant: actionVariant("default", "flat"),
              size: "sm",
            })}
          >
            {<FileOutput className="h-4 w-4" aria-hidden />}
            {t("openInvoice")}
          </ActionLink>
        ) : (
          <Button
            size="sm"
            onPress={async () => {
              setBusy(true);
              const result = await convertProformaAction({ id: invoice.id });
              setBusy(false);
              if (!result.ok) return fail(result.error);
              router.push(`/muhasebe/faturalar/${result.data.id}`);
            }}
            variant={actionVariant("primary", "flat")}
            isPending={busy}
          >
            {busy ? <Spinner size="sm" tone="current" /> : null}
            {<FileOutput className="h-4 w-4" aria-hidden />}
            {t("convert")}
          </Button>
        )
      ) : null}
      {invoice.kind !== "CREDIT_NOTE" &&
      (invoice.status === "ISSUED" || invoice.status === "PAID") &&
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

      <ConfirmDialog
        isOpen={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm === "issue" ? t("issueTitle") : t("deleteTitle")}
        message={confirm === "issue" ? t("issueConfirm") : t("deleteConfirm")}
        confirmLabel={confirm === "issue" ? t("issue") : t("deleteDraft")}
        confirmColor={confirm === "issue" ? "primary" : "danger"}
        onConfirm={async () => {
          if (confirm === "issue") {
            const result = await issueInvoiceAction({ id: invoice.id });
            if (!result.ok) return fail(result.error);
            done(t("issued", { number: result.data.number }));
          } else {
            const result = await deleteInvoiceDraftAction({ id: invoice.id });
            if (!result.ok) return fail(result.error);
            notify.success(t("deleted"));
            router.push("/muhasebe/faturalar");
          }
        }}
      />

      <Dialog isOpen={paymentOpen} onOpenChange={setPaymentOpen} size="md" className={"w-full max-w-md "}>
              {({ close: onClose }) => (
                <>
                  <DialogDismissButton />
                  <Dialog.Header>
                    <Dialog.Heading className="flex items-center gap-2">
                      {t("paymentTitle", { number: invoice.number ?? "" })}
                    </Dialog.Heading>
                  </Dialog.Header>
                  <Dialog.Body>
                    <p className="text-sm text-ink-500">{t("paymentHelp")}</p>
                    <TextField
                      value={amount}
                      isRequired
                      onChange={setAmount}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("amount")}</Label>
                      <Input inputMode="decimal" />
                      <Description>
                        {t("openAmount", { amount: openLabel })}
                      </Description>
                    </TextField>
                    {partial ? (
                      <Checkbox
                        isSelected={closeRemainder}
                        onChange={setCloseRemainder}
                      >
                          <Label>
                            <span className="text-sm">
                              {t("closeRemainder", {
                                amount: (
                                  (invoice.openCents - (amountCents ?? 0)) /
                                  100
                                )
                                  .toFixed(2)
                                  .replace(".", ","),
                              })}
                            </span>
                          </Label>
                      </Checkbox>
                    ) : null}
                    <TextField
                      value={paidDate}
                      isRequired
                      onChange={setPaidDate}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("paidDate")}</Label>
                      <Input type="date" />
                    </TextField>
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
                          {accountOptions.map((option) => (
                            <Select.Item
                              key={option.value}
                              id={option.value}
                              textValue={String(option.label)}
                            >
                              <Label>{option.label}</Label>
                            </Select.Item>
                          ))}
                    </Select>
                    <Select
                      isRequired
                      value={categoryId ? categoryId : null}
                      onChange={(selectedValue) => {
                        const keys =
                          selectedValue === null
                            ? undefined
                            : String(selectedValue);
                        return setCategoryId(String(keys ?? ""));
                      }}
                    >
                      <Label>{t("category")}</Label>
                          {categoryOptions.map((option) => (
                            <Select.Item
                              key={option.value}
                              id={option.value}
                              textValue={String(option.label)}
                            >
                              <Label>{option.label}</Label>
                            </Select.Item>
                          ))}
                    </Select>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Button
                      onPress={onClose}
                      variant={actionVariant("default", "light")}
                    >
                      {t("close")}
                    </Button>
                    <Button
                      isDisabled={
                        !paidDate ||
                        !accountId ||
                        !categoryId ||
                        amountCents === null ||
                        amountCents <= 0 ||
                        amountCents > invoice.openCents
                      }
                      onPress={async () => {
                        setBusy(true);
                        const result = await recordInvoicePaymentAction({
                          id: invoice.id,
                          paidDate,
                          accountId,
                          categoryId,
                          amount,
                          closeRemainder: partial && closeRemainder,
                        });
                        setBusy(false);
                        if (!result.ok) return fail(result.error);
                        onClose();
                        done(
                          t("paid", {
                            bookingNumber: result.data.bookingNumber,
                          }),
                        );
                      }}
                      variant={actionVariant("success", "solid")}
                      isPending={busy}
                    >
                      {busy ? <Spinner size="sm" tone="current" /> : null}
                      {t("recordPayment")}
                    </Button>
                  </Dialog.Footer>
                </>
              )}
      </Dialog>

      <Dialog isOpen={cancelOpen} onOpenChange={setCancelOpen} size="md" className={"w-full max-w-md "}>
              {({ close: onClose }) => (
                <>
                  <DialogDismissButton />
                  <Dialog.Header>
                    <Dialog.Heading className="flex items-center gap-2">
                      {t("cancelTitle", { number: invoice.number ?? "" })}
                    </Dialog.Heading>
                  </Dialog.Header>
                  <Dialog.Body>
                    <p className="text-sm text-ink-500">
                      {invoice.status === "PAID"
                        ? t("cancelPaidHelp")
                        : t("cancelHelp")}
                    </p>
                    {invoice.kind === "INVOICE" ? (
                      <p className="text-xs text-ink-500">
                        {t("cancelCreditNoteHint")}
                      </p>
                    ) : null}
                    <TextField
                      value={reason}
                      isRequired
                      onChange={setReason}
                      className={["w-full"].filter(Boolean).join(" ")}
                    >
                      <Label>{t("reason")}</Label>
                      <TextArea
                        rows={2}
                        className={["[field-sizing:content]"]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    </TextField>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Button
                      onPress={onClose}
                      variant={actionVariant("default", "light")}
                    >
                      {t("close")}
                    </Button>
                    <Button
                      isDisabled={reason.trim().length < 3}
                      onPress={async () => {
                        setBusy(true);
                        const result = await cancelInvoiceAction({
                          id: invoice.id,
                          reason,
                        });
                        setBusy(false);
                        if (!result.ok) return fail(result.error);
                        onClose();
                        done(t("cancelled"));
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
    </div>
  );
}
