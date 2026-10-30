"use client";

import { addToast, Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Textarea } from "@heroui/react";
import { Ban, CheckCircle2, FileOutput, HandCoins, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
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
  invoice: { id: string; kind: "INVOICE" | "PROFORMA"; status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED"; number: string | null; categoryId: string | null; convertedInvoiceId: string | null };
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
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accountOptions[0]?.value ?? "");
  const [categoryId, setCategoryId] = useState(invoice.categoryId ?? "");
  const [reason, setReason] = useState("");

  const done = (message: string) => {
    addToast({ title: message, color: "success" });
    router.refresh();
  };
  const fail = (error: string): void => {
    addToast({ title: error, color: "danger" });
  };
  const draft = invoice.status === "DRAFT";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PdfSplitButton buildHref={(lang) => `/api/accounting/invoices/${invoice.id}/pdf?lang=${lang}`} label={draft ? t("previewPdf") : t("pdf")} aria={t("pdf")} />
      {draft && can.update ? (
        <>
          <Button as="a" href={`/muhasebe/faturalar/${invoice.id}?duzenle=${invoice.id}`} size="sm" variant="flat" startContent={<Pencil className="h-4 w-4" aria-hidden />}>
            {t("edit")}
          </Button>
          <Button size="sm" color="primary" startContent={<CheckCircle2 className="h-4 w-4" aria-hidden />} onPress={() => setConfirm("issue")}>
            {t("issue")}
          </Button>
        </>
      ) : null}
      {draft && can.delete ? (
        <Button size="sm" variant="light" color="danger" startContent={<Trash2 className="h-4 w-4" aria-hidden />} onPress={() => setConfirm("delete")}>
          {t("deleteDraft")}
        </Button>
      ) : null}
      {invoice.kind === "INVOICE" && invoice.status === "ISSUED" && can.create ? (
        <Button size="sm" color="success" startContent={<HandCoins className="h-4 w-4" aria-hidden />} onPress={() => setPaymentOpen(true)}>
          {t("recordPayment")}
        </Button>
      ) : null}
      {invoice.kind === "PROFORMA" && (invoice.status === "ISSUED" || invoice.status === "PAID") && can.create ? (
        invoice.convertedInvoiceId ? (
          <Button as="a" href={`/muhasebe/faturalar/${invoice.convertedInvoiceId}`} size="sm" variant="flat" startContent={<FileOutput className="h-4 w-4" aria-hidden />}>
            {t("openInvoice")}
          </Button>
        ) : (
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<FileOutput className="h-4 w-4" aria-hidden />}
            isLoading={busy}
            onPress={async () => {
              setBusy(true);
              const result = await convertProformaAction({ id: invoice.id });
              setBusy(false);
              if (!result.ok) return fail(result.error);
              router.push(`/muhasebe/faturalar/${result.data.id}`);
            }}
          >
            {t("convert")}
          </Button>
        )
      ) : null}
      {(invoice.status === "ISSUED" || invoice.status === "PAID") && can.delete ? (
        <Button size="sm" variant="flat" color="danger" startContent={<Ban className="h-4 w-4" aria-hidden />} onPress={() => setCancelOpen(true)}>
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
            addToast({ title: t("deleted"), color: "success" });
            router.push("/muhasebe/faturalar");
          }
        }}
      />

      <Modal isOpen={paymentOpen} onOpenChange={setPaymentOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("paymentTitle", { number: invoice.number ?? "" })}</ModalHeader>
              <ModalBody>
                <p className="text-small text-default-500">{t("paymentHelp")}</p>
                <Input type="date" label={t("paidDate")} labelPlacement="outside" value={paidDate} onValueChange={setPaidDate} isRequired />
                <Select label={t("account")} labelPlacement="outside" selectedKeys={accountId ? [accountId] : []} onSelectionChange={(keys) => setAccountId(String(Array.from(keys)[0] ?? ""))} isRequired>
                  {accountOptions.map((option) => (
                    <SelectItem key={option.value}>{option.label}</SelectItem>
                  ))}
                </Select>
                <Select label={t("category")} labelPlacement="outside" selectedKeys={categoryId ? [categoryId] : []} onSelectionChange={(keys) => setCategoryId(String(Array.from(keys)[0] ?? ""))} isRequired>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value}>{option.label}</SelectItem>
                  ))}
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("close")}
                </Button>
                <Button
                  color="success"
                  isLoading={busy}
                  isDisabled={!paidDate || !accountId || !categoryId}
                  onPress={async () => {
                    setBusy(true);
                    const result = await recordInvoicePaymentAction({ id: invoice.id, paidDate, accountId, categoryId });
                    setBusy(false);
                    if (!result.ok) return fail(result.error);
                    onClose();
                    done(t("paid", { bookingNumber: result.data.bookingNumber }));
                  }}
                >
                  {t("recordPayment")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={cancelOpen} onOpenChange={setCancelOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("cancelTitle", { number: invoice.number ?? "" })}</ModalHeader>
              <ModalBody>
                <p className="text-small text-default-500">{invoice.status === "PAID" ? t("cancelPaidHelp") : t("cancelHelp")}</p>
                <Textarea label={t("reason")} labelPlacement="outside" value={reason} onValueChange={setReason} isRequired minRows={2} />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("close")}
                </Button>
                <Button
                  color="danger"
                  isLoading={busy}
                  isDisabled={reason.trim().length < 3}
                  onPress={async () => {
                    setBusy(true);
                    const result = await cancelInvoiceAction({ id: invoice.id, reason });
                    setBusy(false);
                    if (!result.ok) return fail(result.error);
                    onClose();
                    done(t("cancelled"));
                  }}
                >
                  {t("cancel")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
