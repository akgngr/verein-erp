"use client";

import { addToast, Button, Checkbox, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Tab, Tabs } from "@heroui/react";
import { EyeOff, Link2, Undo2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { bookBankTransactionAction, setBankTransactionStatusAction } from "../actions/bank-actions";
import type { BankRow } from "../queries/bank";
import { selectionKey } from "./bank-import-card";

type Option = { value: string; label: string };
const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const day = (date: Date) => date.toISOString().slice(0, 10).split("-").reverse().join(".");

/** ACC-4 ekstre satırları: öneriler (gerekçeli), fişe bağla / özel / yok say. */
export function BankTransactionList({
  rows,
  canEdit,
  incomeCategories,
  expenseCategories,
  invoices,
  payables,
  defaultIncomeCategoryId,
}: {
  rows: BankRow[];
  canEdit: boolean;
  incomeCategories: Option[];
  expenseCategories: Option[];
  invoices: Array<Option & { openCents: number }>;
  payables: Array<Option & { openCents: number }>;
  defaultIncomeCategoryId: string | null;
}) {
  const t = useTranslations("accounting.bank");
  const router = useRouter();
  const [active, setActive] = useState<BankRow | null>(null);
  const [mode, setMode] = useState<"invoice" | "payable" | "category">("category");
  const [payableId, setPayableId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [learnRule, setLearnRule] = useState<"NONE" | "COUNTERPARTY" | "PURPOSE">("NONE");
  const [closeRemainder, setCloseRemainder] = useState(false);
  const [busy, setBusy] = useState(false);

  const open = (row: BankRow, preferInvoice?: string, rule?: { categoryId: string; taxRate: number }, preferPayable?: string) => {
    setActive(row);
    const payableSuggestion = preferPayable ?? (rule ? undefined : row.suggestions.find((item) => item.kind === "payable")?.payableId);
    setPayableId(payableSuggestion ?? "");
    const invoiceSuggestion = preferInvoice ?? row.suggestions.find((item) => item.kind === "invoice")?.invoiceId;
    const ruleSuggestion = rule ?? row.suggestions.find((item) => item.kind === "rule");
    setMode(row.amountCents > 0 && invoiceSuggestion && !rule ? "invoice" : "category");
    setInvoiceId(invoiceSuggestion ?? "");
    setCategoryId(ruleSuggestion?.categoryId ?? (row.amountCents > 0 ? defaultIncomeCategoryId ?? "" : ""));
    setTaxRate(String(ruleSuggestion?.taxRate ?? 0));
    setLearnRule(ruleSuggestion ? "NONE" : row.counterpartyName ? "COUNTERPARTY" : "NONE");
    setCloseRemainder(false);
    if (row.amountCents < 0 && payableSuggestion) setMode("payable");
  };

  const setStatus = async (row: BankRow, status: "OPEN" | "PRIVATE" | "IGNORED") => {
    const result = await setBankTransactionStatusAction({ id: row.id, status });
    if (!result.ok) return addToast({ title: result.error, color: "danger" });
    router.refresh();
  };

  const submit = async () => {
    if (!active) return;
    setBusy(true);
    const result =
      mode === "invoice"
        ? await bookBankTransactionAction({ mode, id: active.id, invoiceId, categoryId, closeRemainder })
        : mode === "payable"
          ? await bookBankTransactionAction({ mode, id: active.id, payableId })
          : await bookBankTransactionAction({ mode, id: active.id, categoryId, taxRate, learnRule });
    setBusy(false);
    if (!result.ok) return addToast({ title: result.error, color: "danger" });
    addToast({ title: t("booked", { number: result.data.bookingNumber }), color: "success" });
    setActive(null);
    router.refresh();
  };

  const categories = active && active.amountCents < 0 ? expenseCategories : incomeCategories;
  const selectedInvoice = invoices.find((invoice) => invoice.value === invoiceId);
  const selectedPayable = payables.find((payable) => payable.value === payableId);
  const remainder = active && selectedInvoice ? selectedInvoice.openCents - active.amountCents : 0;

  if (!rows.length) return <p className="py-6 text-center text-small text-default-500">{t("empty")}</p>;

  return (
    <>
      <ul className="flex flex-col divide-y divide-default-100 rounded-medium border border-default-200 bg-content1">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-small">
                <span className="tabular-nums text-default-500">{day(row.bookingDate)}</span>
                <span className="font-medium">{row.counterpartyName ?? t("unknownParty")}</span>
                <span className="text-tiny text-default-400">{row.accountName}</span>
              </div>
              <span className="break-words text-tiny text-default-600">{row.purpose || "—"}</span>
              {row.suggestions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {row.suggestions.map((suggestion) => (
                    <Chip
                      key={suggestion.kind === "invoice" ? suggestion.invoiceId : suggestion.kind === "payable" ? suggestion.payableId : suggestion.ruleId}
                      size="sm"
                      variant="flat"
                      color={suggestion.score >= 60 ? "success" : "primary"}
                      className={canEdit ? "cursor-pointer" : ""}
                      onClick={canEdit ? () => (suggestion.kind === "invoice" ? open(row, suggestion.invoiceId) : suggestion.kind === "payable" ? open(row, undefined, undefined, suggestion.payableId) : open(row, undefined, suggestion)) : undefined}
                    >
                      {suggestion.label} · {suggestion.reasons.map((reason) => t(`reasons.${reason}`)).join(", ")}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <span className={`min-w-24 text-right font-semibold tabular-nums ${row.amountCents < 0 ? "text-danger" : "text-success"}`}>{euro(row.amountCents)}</span>
              {canEdit && row.status === "OPEN" ? (
                <>
                  <Button size="sm" color="primary" variant="flat" startContent={<Link2 className="h-4 w-4" aria-hidden />} onPress={() => open(row)}>
                    {t("actions.book")}
                  </Button>
                  <Button size="sm" variant="light" startContent={<UserRound className="h-4 w-4" aria-hidden />} onPress={() => setStatus(row, "PRIVATE")}>
                    {t("actions.private")}
                  </Button>
                  <Button size="sm" variant="light" isIconOnly aria-label={t("actions.ignore")} onPress={() => setStatus(row, "IGNORED")}>
                    <EyeOff className="h-4 w-4" aria-hidden />
                  </Button>
                </>
              ) : null}
              {canEdit && (row.status === "PRIVATE" || row.status === "IGNORED") ? (
                <Button size="sm" variant="light" startContent={<Undo2 className="h-4 w-4" aria-hidden />} onPress={() => setStatus(row, "OPEN")}>
                  {t("actions.reopen")}
                </Button>
              ) : null}
              {row.status === "BOOKED" && row.bookingIds[0] ? (
                <Button as="a" href={`/muhasebe/${row.bookingIds[0]}`} size="sm" variant="light">
                  {t("actions.openBooking")}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <Modal isOpen={active !== null} onOpenChange={(isOpen) => !isOpen && setActive(null)} size="lg">
        <ModalContent>
          {(close) =>
            active ? (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <span>{t("modal.title")}</span>
                  <span className="text-small font-normal text-default-500">
                    {day(active.bookingDate)} · {active.counterpartyName ?? t("unknownParty")} · {euro(active.amountCents)}
                  </span>
                </ModalHeader>
                <ModalBody className="gap-4">
                  {active.amountCents > 0 ? (
                    <Tabs selectedKey={mode} onSelectionChange={(key) => setMode(key as "invoice" | "category")} aria-label={t("modal.title")}>
                      <Tab key="invoice" title={t("modal.invoice")} />
                      <Tab key="category" title={t("modal.category")} />
                    </Tabs>
                  ) : payables.length ? (
                    <Tabs selectedKey={mode} onSelectionChange={(key) => setMode(key as "payable" | "category")} aria-label={t("modal.title")}>
                      <Tab key="payable" title={t("modal.payable")} />
                      <Tab key="category" title={t("modal.category")} />
                    </Tabs>
                  ) : null}
                  {mode === "payable" ? (
                    <Select id="bank-book-payable" label={t("modal.payableSelect")} labelPlacement="outside" selectedKeys={payableId ? [payableId] : []} onSelectionChange={(keys) => setPayableId(selectionKey(keys))}>
                      {payables.map((payable) => (
                        <SelectItem key={payable.value}>{`${payable.label} — ${euro(payable.openCents)}`}</SelectItem>
                      ))}
                    </Select>
                  ) : null}
                  {mode === "invoice" ? (
                    <Select id="bank-book-invoice" label={t("modal.invoiceSelect")} labelPlacement="outside" selectedKeys={invoiceId ? [invoiceId] : []} onSelectionChange={(keys) => setInvoiceId(selectionKey(keys))}>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.value}>{`${invoice.label} — ${euro(invoice.openCents)}`}</SelectItem>
                      ))}
                    </Select>
                  ) : null}
                  {mode !== "payable" ? (
                  <Select id="bank-book-category" label={t("modal.categorySelect")} labelPlacement="outside" selectedKeys={categoryId ? [categoryId] : []} onSelectionChange={(keys) => setCategoryId(selectionKey(keys))}>
                    {categories.map((category) => (
                      <SelectItem key={category.value}>{category.label}</SelectItem>
                    ))}
                  </Select>
                  ) : null}
                  {mode === "category" ? (
                    <>
                      <Select id="bank-book-tax" label={t("modal.taxRate")} labelPlacement="outside" selectedKeys={[taxRate]} onSelectionChange={(keys) => setTaxRate(selectionKey(keys) || "0")}>
                        {["0", "7", "19"].map((rate) => (
                          <SelectItem key={rate}>{`${rate} %`}</SelectItem>
                        ))}
                      </Select>
                      <Select id="bank-book-rule" label={t("modal.learn")} labelPlacement="outside" selectedKeys={[learnRule]} onSelectionChange={(keys) => setLearnRule((selectionKey(keys) || "NONE") as typeof learnRule)}>
                        <SelectItem key="NONE">{t("modal.learnNone")}</SelectItem>
                        <SelectItem key="COUNTERPARTY">{t("modal.learnCounterparty")}</SelectItem>
                        <SelectItem key="PURPOSE">{t("modal.learnPurpose")}</SelectItem>
                      </Select>
                      <p className="-mt-2 px-1 text-tiny text-default-500">{t("modal.learnHint")}</p>
                    </>
                  ) : selectedInvoice && remainder > 0 ? (
                    <Checkbox isSelected={closeRemainder} onValueChange={setCloseRemainder} size="sm">
                      <span className="text-small">{t("modal.closeRemainder", { amount: euro(remainder) })}</span>
                    </Checkbox>
                  ) : null}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={close}>
                    {t("modal.cancel")}
                  </Button>
                  <Button color="primary" isLoading={busy} isDisabled={mode === "payable" ? !payableId || (selectedPayable ? selectedPayable.openCents < -active.amountCents : true) : !categoryId || (mode === "invoice" && (!invoiceId || remainder < 0))} onPress={submit}>
                    {t("modal.submit")}
                  </Button>
                </ModalFooter>
              </>
            ) : null
          }
        </ModalContent>
      </Modal>
    </>
  );
}
