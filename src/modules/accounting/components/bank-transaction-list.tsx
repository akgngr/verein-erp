"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import {
  toast,
  Chip,
  Button,
  Link as ActionLink,
  buttonVariants,
  Spinner,
  Modal,
  Checkbox,
  Label,
  Select,
  ListBox,
  Tabs,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { EyeOff, Link2, Undo2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  bookBankTransactionAction,
  setBankTransactionStatusAction,
} from "../actions/bank-actions";
import type { BankRow } from "../queries/bank";

type Option = { value: string; label: string };
const euro = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const day = (date: Date) =>
  date.toISOString().slice(0, 10).split("-").reverse().join(".");

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
  const [mode, setMode] = useState<"invoice" | "payable" | "category">(
    "category",
  );
  const [payableId, setPayableId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [learnRule, setLearnRule] = useState<
    "NONE" | "COUNTERPARTY" | "PURPOSE"
  >("NONE");
  const [closeRemainder, setCloseRemainder] = useState(false);
  const [busy, setBusy] = useState(false);

  const open = (
    row: BankRow,
    preferInvoice?: string,
    rule?: { categoryId: string; taxRate: number },
    preferPayable?: string,
  ) => {
    setActive(row);
    const payableSuggestion =
      preferPayable ??
      (rule
        ? undefined
        : row.suggestions.find((item) => item.kind === "payable")?.payableId);
    setPayableId(payableSuggestion ?? "");
    const invoiceSuggestion =
      preferInvoice ??
      row.suggestions.find((item) => item.kind === "invoice")?.invoiceId;
    const ruleSuggestion =
      rule ?? row.suggestions.find((item) => item.kind === "rule");
    setMode(
      row.amountCents > 0 && invoiceSuggestion && !rule
        ? "invoice"
        : "category",
    );
    setInvoiceId(invoiceSuggestion ?? "");
    setCategoryId(
      ruleSuggestion?.categoryId ??
        (row.amountCents > 0 ? (defaultIncomeCategoryId ?? "") : ""),
    );
    setTaxRate(String(ruleSuggestion?.taxRate ?? 0));
    setLearnRule(
      ruleSuggestion ? "NONE" : row.counterpartyName ? "COUNTERPARTY" : "NONE",
    );
    setCloseRemainder(false);
    if (row.amountCents < 0 && payableSuggestion) setMode("payable");
  };

  const setStatus = async (
    row: BankRow,
    status: "OPEN" | "PRIVATE" | "IGNORED",
  ) => {
    const result = await setBankTransactionStatusAction({ id: row.id, status });
    if (!result.ok) return toast(result.error, { variant: "danger" });
    router.refresh();
  };

  const submit = async () => {
    if (!active) return;
    setBusy(true);
    const result =
      mode === "invoice"
        ? await bookBankTransactionAction({
            mode,
            id: active.id,
            invoiceId,
            categoryId,
            closeRemainder,
          })
        : mode === "payable"
          ? await bookBankTransactionAction({ mode, id: active.id, payableId })
          : await bookBankTransactionAction({
              mode,
              id: active.id,
              categoryId,
              taxRate,
              learnRule,
            });
    setBusy(false);
    if (!result.ok) return toast(result.error, { variant: "danger" });
    toast(t("booked", { number: result.data.bookingNumber }), {
      variant: "success",
    });
    setActive(null);
    router.refresh();
  };

  const categories =
    active && active.amountCents < 0 ? expenseCategories : incomeCategories;
  const selectedInvoice = invoices.find(
    (invoice) => invoice.value === invoiceId,
  );
  const selectedPayable = payables.find(
    (payable) => payable.value === payableId,
  );
  const remainder =
    active && selectedInvoice
      ? selectedInvoice.openCents - active.amountCents
      : 0;

  if (!rows.length)
    return (
      <p className="py-6 text-center text-sm text-ink-500">{t("empty")}</p>
    );

  return (
    <>
      <ul className="flex flex-col divide-y divide-ink-100 rounded-lg border border-ink-200 bg-surface">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="tabular-nums text-ink-500">
                  {day(row.bookingDate)}
                </span>
                <span className="font-medium">
                  {row.counterpartyName ?? t("unknownParty")}
                </span>
                <span className="text-xs text-ink-400">{row.accountName}</span>
              </div>
              <span className="break-words text-xs text-ink-600">
                {row.purpose || "—"}
              </span>
              {row.suggestions.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {row.suggestions.map((suggestion) => (
                    <Chip
                      key={
                        suggestion.kind === "invoice"
                          ? suggestion.invoiceId
                          : suggestion.kind === "payable"
                            ? suggestion.payableId
                            : suggestion.ruleId
                      }
                      size="sm"
                      onClick={
                        canEdit
                          ? () =>
                              suggestion.kind === "invoice"
                                ? open(row, suggestion.invoiceId)
                                : suggestion.kind === "payable"
                                  ? open(
                                      row,
                                      undefined,
                                      undefined,
                                      suggestion.payableId,
                                    )
                                  : open(row, undefined, suggestion)
                          : undefined
                      }
                      color={statusTone(
                        suggestion.score >= 60 ? "success" : "primary",
                      )}
                      variant={"soft"}
                      className={[canEdit ? "cursor-pointer" : ""]
                        .filter(Boolean)
                        .join(" ")}
                      style={statusStyle(
                        suggestion.score >= 60 ? "success" : "primary",
                      )}
                    >
                      {suggestion.label} ·{" "}
                      {suggestion.reasons
                        .map((reason) => t(`reasons.${reason}`))
                        .join(", ")}
                    </Chip>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <span
                className={`min-w-24 text-right font-semibold tabular-nums ${row.amountCents < 0 ? "text-danger" : "text-success"}`}
              >
                {euro(row.amountCents)}
              </span>
              {canEdit && row.status === "OPEN" ? (
                <>
                  <Button
                    size="sm"
                    onPress={() => open(row)}
                    variant={actionVariant("primary", "flat")}
                  >
                    {<Link2 className="h-4 w-4" aria-hidden />}
                    {t("actions.book")}
                  </Button>
                  <Button
                    size="sm"
                    onPress={() => setStatus(row, "PRIVATE")}
                    variant={actionVariant("default", "light")}
                  >
                    {<UserRound className="h-4 w-4" aria-hidden />}
                    {t("actions.private")}
                  </Button>
                  <Button
                    size="sm"
                    isIconOnly
                    aria-label={t("actions.ignore")}
                    onPress={() => setStatus(row, "IGNORED")}
                    variant={actionVariant("default", "light")}
                  >
                    <EyeOff className="h-4 w-4" aria-hidden />
                  </Button>
                </>
              ) : null}
              {canEdit &&
              (row.status === "PRIVATE" || row.status === "IGNORED") ? (
                <Button
                  size="sm"
                  onPress={() => setStatus(row, "OPEN")}
                  variant={actionVariant("default", "light")}
                >
                  {<Undo2 className="h-4 w-4" aria-hidden />}
                  {t("actions.reopen")}
                </Button>
              ) : null}
              {row.status === "BOOKED" && row.bookingIds[0] ? (
                <ActionLink
                  href={`/muhasebe/${row.bookingIds[0]}`}
                  className={buttonVariants({
                    variant: actionVariant("default", "light"),
                    size: "sm",
                  })}
                >
                  {t("actions.openBooking")}
                </ActionLink>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={active !== null}
        onOpenChange={(isOpen) => !isOpen && setActive(null)}
      >
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className={"w-full max-w-lg "}>
              {({ close: close }) =>
                active ? (
                  <>
                    <DialogDismissButton />
                    <Modal.Header className="flex flex-col gap-1">
                      <Modal.Heading className="flex items-center gap-2">
                        <span>{t("modal.title")}</span>
                      </Modal.Heading>
                      <span className="text-sm font-normal text-ink-500">
                        {day(active.bookingDate)} ·{" "}
                        {active.counterpartyName ?? t("unknownParty")} ·{" "}
                        {euro(active.amountCents)}
                      </span>
                    </Modal.Header>
                    <Modal.Body className="gap-4">
                      {active.amountCents > 0 ? (
                        <Tabs
                          selectedKey={mode}
                          onSelectionChange={(key) =>
                            setMode(key as "invoice" | "category")
                          }
                          variant="secondary"
                        >
                          <Tabs.ListContainer>
                            <Tabs.List aria-label={t("modal.title")}>
                              <Tabs.Tab id={"invoice"} key={"invoice"}>
                                {t("modal.invoice")}
                                <Tabs.Indicator />
                              </Tabs.Tab>
                              <Tabs.Tab id={"category"} key={"category"}>
                                {t("modal.category")}
                                <Tabs.Indicator />
                              </Tabs.Tab>
                            </Tabs.List>
                          </Tabs.ListContainer>
                        </Tabs>
                      ) : payables.length ? (
                        <Tabs
                          selectedKey={mode}
                          onSelectionChange={(key) =>
                            setMode(key as "payable" | "category")
                          }
                          variant="secondary"
                        >
                          <Tabs.ListContainer>
                            <Tabs.List aria-label={t("modal.title")}>
                              <Tabs.Tab id={"payable"} key={"payable"}>
                                {t("modal.payable")}
                                <Tabs.Indicator />
                              </Tabs.Tab>
                              <Tabs.Tab id={"category"} key={"category"}>
                                {t("modal.category")}
                                <Tabs.Indicator />
                              </Tabs.Tab>
                            </Tabs.List>
                          </Tabs.ListContainer>
                        </Tabs>
                      ) : null}
                      {mode === "payable" ? (
                        <Select
                          id="bank-book-payable"
                          value={payableId ? payableId : null}
                          onChange={(selectedValue) => {
                            const keys =
                              selectedValue === null
                                ? undefined
                                : String(selectedValue);
                            return setPayableId(String(keys ?? ""));
                          }}
                        >
                          <Label>{t("modal.payableSelect")}</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {payables.map((payable) => (
                                <ListBox.Item
                                  key={payable.value}
                                  id={payable.value}
                                  textValue={String(
                                    `${payable.label} — ${euro(payable.openCents)}`,
                                  )}
                                >
                                  <Label>{`${payable.label} — ${euro(payable.openCents)}`}</Label>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      ) : null}
                      {mode === "invoice" ? (
                        <Select
                          id="bank-book-invoice"
                          value={invoiceId ? invoiceId : null}
                          onChange={(selectedValue) => {
                            const keys =
                              selectedValue === null
                                ? undefined
                                : String(selectedValue);
                            return setInvoiceId(String(keys ?? ""));
                          }}
                        >
                          <Label>{t("modal.invoiceSelect")}</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {invoices.map((invoice) => (
                                <ListBox.Item
                                  key={invoice.value}
                                  id={invoice.value}
                                  textValue={String(
                                    `${invoice.label} — ${euro(invoice.openCents)}`,
                                  )}
                                >
                                  <Label>{`${invoice.label} — ${euro(invoice.openCents)}`}</Label>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      ) : null}
                      {mode !== "payable" ? (
                        <Select
                          id="bank-book-category"
                          value={categoryId ? categoryId : null}
                          onChange={(selectedValue) => {
                            const keys =
                              selectedValue === null
                                ? undefined
                                : String(selectedValue);
                            return setCategoryId(String(keys ?? ""));
                          }}
                        >
                          <Label>{t("modal.categorySelect")}</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {categories.map((category) => (
                                <ListBox.Item
                                  key={category.value}
                                  id={category.value}
                                  textValue={String(category.label)}
                                >
                                  <Label>{category.label}</Label>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      ) : null}
                      {mode === "category" ? (
                        <>
                          <Select
                            id="bank-book-tax"
                            value={taxRate}
                            onChange={(selectedValue) => {
                              const keys =
                                selectedValue === null
                                  ? undefined
                                  : String(selectedValue);
                              return setTaxRate(String(keys ?? "") || "0");
                            }}
                          >
                            <Label>{t("modal.taxRate")}</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {["0", "7", "19"].map((rate) => (
                                  <ListBox.Item
                                    key={rate}
                                    id={rate}
                                    textValue={String(`${rate} %`)}
                                  >
                                    <Label>{`${rate} %`}</Label>
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <Select
                            id="bank-book-rule"
                            value={learnRule}
                            onChange={(selectedValue) => {
                              const keys =
                                selectedValue === null
                                  ? undefined
                                  : String(selectedValue);
                              return setLearnRule(
                                (String(keys ?? "") ||
                                  "NONE") as typeof learnRule,
                              );
                            }}
                          >
                            <Label>{t("modal.learn")}</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item
                                  key="NONE"
                                  id={"NONE"}
                                  textValue={String(t("modal.learnNone"))}
                                >
                                  <Label>{t("modal.learnNone")}</Label>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                                <ListBox.Item
                                  key="COUNTERPARTY"
                                  id={"COUNTERPARTY"}
                                  textValue={String(
                                    t("modal.learnCounterparty"),
                                  )}
                                >
                                  <Label>{t("modal.learnCounterparty")}</Label>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                                <ListBox.Item
                                  key="PURPOSE"
                                  id={"PURPOSE"}
                                  textValue={String(t("modal.learnPurpose"))}
                                >
                                  <Label>{t("modal.learnPurpose")}</Label>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <p className="-mt-2 px-1 text-xs text-ink-500">
                            {t("modal.learnHint")}
                          </p>
                        </>
                      ) : selectedInvoice && remainder > 0 ? (
                        <Checkbox
                          isSelected={closeRemainder}
                          onChange={setCloseRemainder}
                        >
                          <Checkbox.Content>
                            <Checkbox.Control className="size-4">
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Label>
                              <span className="text-sm">
                                {t("modal.closeRemainder", {
                                  amount: euro(remainder),
                                })}
                              </span>
                            </Label>
                          </Checkbox.Content>
                        </Checkbox>
                      ) : null}
                    </Modal.Body>
                    <Modal.Footer>
                      <Button
                        onPress={close}
                        variant={actionVariant("default", "light")}
                      >
                        {t("modal.cancel")}
                      </Button>
                      <Button
                        isDisabled={
                          mode === "payable"
                            ? !payableId ||
                              (selectedPayable
                                ? selectedPayable.openCents <
                                  -active.amountCents
                                : true)
                            : !categoryId ||
                              (mode === "invoice" &&
                                (!invoiceId || remainder < 0))
                        }
                        onPress={submit}
                        variant={actionVariant("primary", "solid")}
                        isPending={busy}
                      >
                        {busy ? <Spinner size="sm" color="current" /> : null}
                        {t("modal.submit")}
                      </Button>
                    </Modal.Footer>
                  </>
                ) : null
              }
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
