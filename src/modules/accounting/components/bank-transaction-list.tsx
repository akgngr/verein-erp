"use client";

import { notify } from "@/shared/components/ui/notify";
import { Checkbox, Dialog, Input, Label, Select, Spinner, StatusChip, Tabs, TextArea, TextField, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { EyeOff, Link2, Undo2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  bookBankTransactionAction,
  reverseBankTransactionAction,
  setBankTransactionStatusAction,
} from "../actions/bank-actions";
import type { BankRow } from "../queries/bank";
import {
  canMatchPayableToBankAmount,
  filterOpenPayablesForDirection,
} from "../services/bank-matching";

type Option = { value: string; label: string };
type OpenOption = Option & { openCents: number };
type BankMode =
  | "invoice"
  | "payable"
  | "memberDue"
  | "courseCharge"
  | "donation"
  | "category";
type OpenPrefer =
  | { kind: "invoice"; invoiceId: string }
  | { kind: "payable"; payableId: string }
  | { kind: "memberDue"; dueId: string }
  | { kind: "courseCharge"; chargeId: string }
  | { kind: "donation"; donorId: string | null }
  | { kind: "rule"; categoryId: string; taxRate: number };

const NEW_DONOR_VALUE = "__NEW__";
const euro = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const day = (date: Date) =>
  date.toISOString().slice(0, 10).split("-").reverse().join(".");

/** ACC-4 / #616 ekstre satırları: öneriler (gerekçeli), fişe / aidata / kursa / bağışa bağla / özel / yok say. */
export function BankTransactionList({
  rows,
  canEdit,
  canBookMembers = false,
  canBookCourses = false,
  canBookDonations = false,
  incomeCategories,
  expenseCategories,
  invoices,
  payables,
  memberDues = [],
  courseCharges = [],
  donors = [],
  defaultIncomeCategoryId,
  defaultMemberFeeCategoryId = null,
}: {
  rows: BankRow[];
  canEdit: boolean;
  canBookMembers?: boolean;
  canBookCourses?: boolean;
  canBookDonations?: boolean;
  incomeCategories: Option[];
  expenseCategories: Option[];
  invoices: OpenOption[];
  payables: OpenOption[];
  memberDues?: OpenOption[];
  courseCharges?: OpenOption[];
  donors?: Option[];
  defaultIncomeCategoryId: string | null;
  defaultMemberFeeCategoryId?: string | null;
}) {
  const t = useTranslations("accounting.bank");
  const router = useRouter();
  const [active, setActive] = useState<BankRow | null>(null);
  const [mode, setMode] = useState<BankMode>("category");
  const [payableId, setPayableId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [dueId, setDueId] = useState("");
  const [chargeId, setChargeId] = useState("");
  const [donorId, setDonorId] = useState<string>(NEW_DONOR_VALUE);
  const [newDonorName, setNewDonorName] = useState("");
  const [newDonorType, setNewDonorType] = useState<"PERSON" | "ORGANIZATION">(
    "PERSON",
  );
  const [purposeNote, setPurposeNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [learnRule, setLearnRule] = useState<
    "NONE" | "COUNTERPARTY" | "PURPOSE"
  >("NONE");
  const [closeRemainder, setCloseRemainder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reversingRow, setReversingRow] = useState<BankRow | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reversingBusy, setReversingBusy] = useState(false);

  const submitReverse = async () => {
    if (!reversingRow) return;
    setReversingBusy(true);
    const result = await reverseBankTransactionAction({
      id: reversingRow.id,
      reason: reverseReason,
    });
    setReversingBusy(false);
    if (!result.ok) return notify.error(result.error);
    notify.success(t("reversed"));
    setReversingRow(null);
    setReverseReason("");
    router.refresh();
  };

  const open = (row: BankRow, prefer?: OpenPrefer) => {
    setActive(row);

    const invoiceSuggestion =
      prefer?.kind === "invoice"
        ? prefer.invoiceId
        : row.suggestions.find((item) => item.kind === "invoice")?.invoiceId;
    const payableSuggestion =
      prefer?.kind === "payable"
        ? prefer.payableId
        : row.suggestions.find((item) => item.kind === "payable")?.payableId;
    const dueSuggestion =
      prefer?.kind === "memberDue"
        ? prefer.dueId
        : row.suggestions.find((item) => item.kind === "memberDue")?.dueId;
    const chargeSuggestion =
      prefer?.kind === "courseCharge"
        ? prefer.chargeId
        : row.suggestions.find((item) => item.kind === "courseCharge")?.chargeId;
    const donationSuggestion =
      prefer?.kind === "donation"
        ? prefer
        : row.suggestions.find((item) => item.kind === "donation");
    const ruleSuggestion =
      prefer?.kind === "rule"
        ? prefer
        : row.suggestions.find((item) => item.kind === "rule");

    setInvoiceId(invoiceSuggestion ?? "");
    setPayableId(payableSuggestion ?? "");
    setDueId(dueSuggestion ?? "");
    setChargeId(chargeSuggestion ?? "");
    setDonorId(donationSuggestion?.donorId ?? NEW_DONOR_VALUE);
    setNewDonorName(row.counterpartyName ?? "");
    setNewDonorType("PERSON");
    setPurposeNote(row.purpose.slice(0, 300));
    setTaxRate(String(ruleSuggestion?.taxRate ?? 0));
    setLearnRule(
      ruleSuggestion ? "NONE" : row.counterpartyName ? "COUNTERPARTY" : "NONE",
    );
    setCloseRemainder(false);

    let nextMode: BankMode = "category";
    if (prefer) {
      if (prefer.kind === "rule") {
        nextMode = "category";
      } else if (prefer.kind === "memberDue" && canBookMembers) {
        nextMode = "memberDue";
      } else if (prefer.kind === "courseCharge" && canBookCourses) {
        nextMode = "courseCharge";
      } else if (prefer.kind === "donation" && canBookDonations) {
        nextMode = "donation";
      } else if (prefer.kind === "invoice" && row.amountCents > 0) {
        nextMode = "invoice";
      } else if (prefer.kind === "payable") {
        nextMode = "payable";
      }
    } else if (row.amountCents < 0) {
      nextMode = payableSuggestion ? "payable" : "category";
    } else {
      const top = row.suggestions[0];
      if (top?.kind === "invoice") nextMode = "invoice";
      else if (top?.kind === "memberDue" && canBookMembers) nextMode = "memberDue";
      else if (top?.kind === "courseCharge" && canBookCourses) nextMode = "courseCharge";
      else if (top?.kind === "donation" && canBookDonations) nextMode = "donation";
      else if (top?.kind === "payable") nextMode = "payable";
      else nextMode = "category";
    }

    setMode(nextMode);
    setCategoryId(
      nextMode === "memberDue"
        ? (defaultMemberFeeCategoryId ?? defaultIncomeCategoryId ?? "")
        : (ruleSuggestion?.categoryId ??
            (row.amountCents > 0 ? (defaultIncomeCategoryId ?? "") : "")),
    );
  };

  const handleModeChange = (next: BankMode) => {
    setMode(next);
    if (next === "memberDue" && (!categoryId || categoryId === defaultIncomeCategoryId)) {
      setCategoryId(defaultMemberFeeCategoryId ?? defaultIncomeCategoryId ?? "");
    }
  };

  const setStatus = async (
    row: BankRow,
    status: "OPEN" | "PRIVATE" | "IGNORED",
  ) => {
    const result = await setBankTransactionStatusAction({ id: row.id, status });
    if (!result.ok) return notify.error(result.error);
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
          : mode === "memberDue"
            ? await bookBankTransactionAction({
                mode,
                id: active.id,
                dueId,
                categoryId,
              })
            : mode === "courseCharge"
              ? await bookBankTransactionAction({
                  mode,
                  id: active.id,
                  chargeId,
                })
              : mode === "donation"
                ? await bookBankTransactionAction({
                    mode,
                    id: active.id,
                    donorId: donorId === NEW_DONOR_VALUE ? null : donorId,
                    newDonorName:
                      donorId === NEW_DONOR_VALUE ? newDonorName.trim() : null,
                    newDonorType,
                    purposeNote: purposeNote.trim() || null,
                  })
                : await bookBankTransactionAction({
                    mode,
                    id: active.id,
                    categoryId,
                    taxRate,
                    learnRule,
                  });
    setBusy(false);
    if (!result.ok) return notify.error(result.error);
    notify.success(t("booked", { number: result.data.bookingNumber }));
    setActive(null);
    router.refresh();
  };

  const categories =
    active && active.amountCents < 0 ? expenseCategories : incomeCategories;
  const applicablePayables = active
    ? filterOpenPayablesForDirection(payables, active.amountCents)
    : [];
  const selectedInvoice = invoices.find(
    (invoice) => invoice.value === invoiceId,
  );
  const selectedPayable = applicablePayables.find(
    (payable) => payable.value === payableId,
  );
  const selectedMemberDue = memberDues.find((due) => due.value === dueId);
  const selectedCourseCharge = courseCharges.find(
    (charge) => charge.value === chargeId,
  );
  const remainder =
    active && selectedInvoice
      ? selectedInvoice.openCents - active.amountCents
      : 0;
  const memberDueOverpaid = Boolean(
    active && selectedMemberDue && active.amountCents > selectedMemberDue.openCents,
  );
  const courseChargeMismatch = Boolean(
    active &&
      selectedCourseCharge &&
      active.amountCents !== selectedCourseCharge.openCents,
  );
  const needsCategory =
    mode === "category" || mode === "invoice" || mode === "memberDue";

  const isSubmitDisabled = () => {
    if (!active) return true;
    if (mode === "payable") {
      return (
        !payableId ||
        !selectedPayable ||
        !canMatchPayableToBankAmount(selectedPayable.openCents, active.amountCents)
      );
    }
    if (mode === "memberDue") {
      return !dueId || !categoryId || memberDueOverpaid;
    }
    if (mode === "courseCharge") {
      return !chargeId || courseChargeMismatch;
    }
    if (mode === "donation") {
      return donorId === NEW_DONOR_VALUE
        ? newDonorName.trim().length < 2
        : !donorId;
    }
    return !categoryId || (mode === "invoice" && (!invoiceId || remainder < 0));
  };

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
                  {row.suggestions.map((suggestion) => {
                    const suggestionKey =
                      suggestion.kind === "invoice"
                        ? `inv:${suggestion.invoiceId}`
                        : suggestion.kind === "payable"
                          ? `pay:${suggestion.payableId}`
                          : suggestion.kind === "memberDue"
                            ? `due:${suggestion.dueId}`
                            : suggestion.kind === "courseCharge"
                              ? `chg:${suggestion.chargeId}`
                              : suggestion.kind === "donation"
                                ? `don:${suggestion.donorId ?? "new"}`
                                : `rule:${suggestion.ruleId}`;
                    const canClickSuggestion =
                      canEdit &&
                      (suggestion.kind === "memberDue"
                        ? canBookMembers
                        : suggestion.kind === "courseCharge"
                          ? canBookCourses
                          : suggestion.kind === "donation"
                            ? canBookDonations
                            : true);
                    return (
                      <StatusChip
                        tone={suggestion.score >= 60 ? "success" : "primary"}
                        key={suggestionKey}
                        onClick={
                          canClickSuggestion
                            ? () =>
                                suggestion.kind === "invoice"
                                  ? open(row, {
                                      kind: "invoice",
                                      invoiceId: suggestion.invoiceId,
                                    })
                                  : suggestion.kind === "payable"
                                    ? open(row, {
                                        kind: "payable",
                                        payableId: suggestion.payableId,
                                      })
                                    : suggestion.kind === "memberDue"
                                      ? open(row, {
                                          kind: "memberDue",
                                          dueId: suggestion.dueId,
                                        })
                                      : suggestion.kind === "courseCharge"
                                        ? open(row, {
                                            kind: "courseCharge",
                                            chargeId: suggestion.chargeId,
                                          })
                                        : suggestion.kind === "donation"
                                          ? open(row, {
                                              kind: "donation",
                                              donorId: suggestion.donorId,
                                            })
                                          : open(row, {
                                              kind: "rule",
                                              categoryId: suggestion.categoryId,
                                              taxRate: suggestion.taxRate,
                                            })
                            : undefined
                        }
                        className={[canClickSuggestion ? "cursor-pointer" : ""]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {suggestion.label} ·{" "}
                        {suggestion.reasons
                          .map((reason) => t(`reasons.${reason}`))
                          .join(", ")}
                      </StatusChip>
                    );
                  })}
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
                <>
                  <ActionLink
                    href={`/muhasebe/${row.bookingIds[0]}`}
                    className={buttonClassName({
                      variant: actionVariant("default", "light"),
                      size: "sm",
                    })}
                  >
                    {t("actions.openBooking")}
                  </ActionLink>
                  {canEdit && row.canReverse ? (
                    <Button
                      size="sm"
                      onPress={() => {
                        setReversingRow(row);
                        setReverseReason("");
                      }}
                      variant={actionVariant("danger", "light")}
                    >
                      <Undo2 className="h-4 w-4" aria-hidden />
                      {t("actions.reverse")}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        isOpen={active !== null}
        onOpenChange={(isOpen) => !isOpen && setActive(null)}
        size="lg"
        className={"w-full max-w-xl "}
      >
        {({ close }) =>
          active ? (
            <>
              <DialogDismissButton />
              <Dialog.Header className="flex flex-col gap-1">
                <Dialog.Heading className="flex items-center gap-2">
                  <span>{t("modal.title")}</span>
                </Dialog.Heading>
                <span className="text-sm font-normal text-ink-500">
                  {day(active.bookingDate)} ·{" "}
                  {active.counterpartyName ?? t("unknownParty")} ·{" "}
                  {euro(active.amountCents)}
                </span>
              </Dialog.Header>
              <Dialog.Body className="gap-4">
                {active.amountCents > 0 ? (
                  <Tabs
                    selectedKey={mode}
                    onSelectionChange={(key) =>
                      handleModeChange(key as BankMode)
                    }
                    emphasis="secondary"
                  >
                    <Tabs.List
                      aria-label={t("modal.title")}
                      className="flex-wrap"
                    >
                      <Tabs.Tab id={"invoice"} key={"invoice"}>
                        {t("modal.invoice")}
                      </Tabs.Tab>
                      {canBookMembers && memberDues.length > 0 ? (
                        <Tabs.Tab id={"memberDue"} key={"memberDue"}>
                          {t("modal.memberDue")}
                        </Tabs.Tab>
                      ) : null}
                      {canBookCourses && courseCharges.length > 0 ? (
                        <Tabs.Tab id={"courseCharge"} key={"courseCharge"}>
                          {t("modal.courseCharge")}
                        </Tabs.Tab>
                      ) : null}
                      {canBookDonations ? (
                        <Tabs.Tab id={"donation"} key={"donation"}>
                          {t("modal.donation")}
                        </Tabs.Tab>
                      ) : null}
                      {applicablePayables.length > 0 ? (
                        <Tabs.Tab id={"payable"} key={"payable"}>
                          {t("modal.creditNote")}
                        </Tabs.Tab>
                      ) : null}
                      <Tabs.Tab id={"category"} key={"category"}>
                        {t("modal.category")}
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs>
                ) : applicablePayables.length ? (
                  <Tabs
                    selectedKey={mode}
                    onSelectionChange={(key) =>
                      handleModeChange(key as BankMode)
                    }
                    emphasis="secondary"
                  >
                    <Tabs.List aria-label={t("modal.title")}>
                      <Tabs.Tab id={"payable"} key={"payable"}>
                        {t("modal.payable")}
                      </Tabs.Tab>
                      <Tabs.Tab id={"category"} key={"category"}>
                        {t("modal.category")}
                      </Tabs.Tab>
                    </Tabs.List>
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
                    <Label>
                      {active.amountCents > 0
                        ? t("modal.creditNoteSelect")
                        : t("modal.payableSelect")}
                    </Label>
                    {applicablePayables.map((payable) => (
                      <Select.Item
                        key={payable.value}
                        id={payable.value}
                        textValue={String(
                          `${payable.label} — ${euro(Math.abs(payable.openCents))}`,
                        )}
                      >
                        <Label>{`${payable.label} — ${euro(Math.abs(payable.openCents))}`}</Label>
                      </Select.Item>
                    ))}
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
                    {invoices.map((invoice) => (
                      <Select.Item
                        key={invoice.value}
                        id={invoice.value}
                        textValue={String(
                          `${invoice.label} — ${euro(invoice.openCents)}`,
                        )}
                      >
                        <Label>{`${invoice.label} — ${euro(invoice.openCents)}`}</Label>
                      </Select.Item>
                    ))}
                  </Select>
                ) : null}
                {mode === "memberDue" ? (
                  <>
                    <Select
                      id="bank-book-member-due"
                      value={dueId ? dueId : null}
                      onChange={(selectedValue) => {
                        const keys =
                          selectedValue === null
                            ? undefined
                            : String(selectedValue);
                        return setDueId(String(keys ?? ""));
                      }}
                    >
                      <Label>{t("modal.memberDueSelect")}</Label>
                      {memberDues.map((due) => (
                        <Select.Item
                          key={due.value}
                          id={due.value}
                          textValue={String(
                            `${due.label} — ${euro(due.openCents)}`,
                          )}
                        >
                          <Label>{`${due.label} — ${euro(due.openCents)}`}</Label>
                        </Select.Item>
                      ))}
                    </Select>
                    {memberDueOverpaid ? (
                      <p className="text-xs text-danger">
                        {t("errors.memberDueOverpayment")}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {mode === "courseCharge" ? (
                  <>
                    <Select
                      id="bank-book-course-charge"
                      value={chargeId ? chargeId : null}
                      onChange={(selectedValue) => {
                        const keys =
                          selectedValue === null
                            ? undefined
                            : String(selectedValue);
                        return setChargeId(String(keys ?? ""));
                      }}
                    >
                      <Label>{t("modal.courseChargeSelect")}</Label>
                      {courseCharges.map((charge) => (
                        <Select.Item
                          key={charge.value}
                          id={charge.value}
                          textValue={String(
                            `${charge.label} — ${euro(charge.openCents)}`,
                          )}
                        >
                          <Label>{`${charge.label} — ${euro(charge.openCents)}`}</Label>
                        </Select.Item>
                      ))}
                    </Select>
                    {courseChargeMismatch ? (
                      <p className="text-xs text-danger">
                        {t("modal.courseAmountMismatchHint")}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {mode === "donation" ? (
                  <>
                    <Select
                      id="bank-book-donor"
                      value={donorId}
                      onChange={(selectedValue) => {
                        const keys =
                          selectedValue === null
                            ? NEW_DONOR_VALUE
                            : String(selectedValue);
                        return setDonorId(keys || NEW_DONOR_VALUE);
                      }}
                    >
                      <Label>{t("modal.donorSelect")}</Label>
                      <Select.Item
                        key={NEW_DONOR_VALUE}
                        id={NEW_DONOR_VALUE}
                        textValue={String(t("modal.donorCreateNew"))}
                      >
                        <Label>{t("modal.donorCreateNew")}</Label>
                      </Select.Item>
                      {donors.map((donor) => (
                        <Select.Item
                          key={donor.value}
                          id={donor.value}
                          textValue={String(donor.label)}
                        >
                          <Label>{donor.label}</Label>
                        </Select.Item>
                      ))}
                    </Select>
                    {donorId === NEW_DONOR_VALUE ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          id="bank-book-new-donor-name"
                          value={newDonorName}
                          onChange={setNewDonorName}
                          isRequired
                        >
                          <Label>{t("modal.newDonorName")}</Label>
                          <Input />
                        </TextField>
                        <Select
                          id="bank-book-new-donor-type"
                          value={newDonorType}
                          onChange={(selectedValue) => {
                            const next = String(selectedValue ?? "PERSON");
                            if (next === "PERSON" || next === "ORGANIZATION") {
                              setNewDonorType(next);
                            }
                          }}
                        >
                          <Label>{t("modal.newDonorType")}</Label>
                          <Select.Item
                            key="PERSON"
                            id="PERSON"
                            textValue={String(t("modal.donorPerson"))}
                          >
                            <Label>{t("modal.donorPerson")}</Label>
                          </Select.Item>
                          <Select.Item
                            key="ORGANIZATION"
                            id="ORGANIZATION"
                            textValue={String(t("modal.donorOrganization"))}
                          >
                            <Label>{t("modal.donorOrganization")}</Label>
                          </Select.Item>
                        </Select>
                      </div>
                    ) : null}
                    <TextField
                      id="bank-book-donation-purpose"
                      value={purposeNote}
                      onChange={setPurposeNote}
                    >
                      <Label>{t("modal.purposeNote")}</Label>
                      <Input />
                    </TextField>
                  </>
                ) : null}
                {needsCategory ? (
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
                    {categories.map((category) => (
                      <Select.Item
                        key={category.value}
                        id={category.value}
                        textValue={String(category.label)}
                      >
                        <Label>{category.label}</Label>
                      </Select.Item>
                    ))}
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
                      {["0", "7", "19"].map((rate) => (
                        <Select.Item
                          key={rate}
                          id={rate}
                          textValue={String(`${rate} %`)}
                        >
                          <Label>{`${rate} %`}</Label>
                        </Select.Item>
                      ))}
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
                          (String(keys ?? "") || "NONE") as typeof learnRule,
                        );
                      }}
                    >
                      <Label>{t("modal.learn")}</Label>
                      <Select.Item
                        key="NONE"
                        id={"NONE"}
                        textValue={String(t("modal.learnNone"))}
                      >
                        <Label>{t("modal.learnNone")}</Label>
                      </Select.Item>
                      <Select.Item
                        key="COUNTERPARTY"
                        id={"COUNTERPARTY"}
                        textValue={String(t("modal.learnCounterparty"))}
                      >
                        <Label>{t("modal.learnCounterparty")}</Label>
                      </Select.Item>
                      <Select.Item
                        key="PURPOSE"
                        id={"PURPOSE"}
                        textValue={String(t("modal.learnPurpose"))}
                      >
                        <Label>{t("modal.learnPurpose")}</Label>
                      </Select.Item>
                    </Select>
                    <p className="-mt-2 px-1 text-xs text-ink-500">
                      {t("modal.learnHint")}
                    </p>
                  </>
                ) : mode === "invoice" && selectedInvoice && remainder > 0 ? (
                  <Checkbox
                    isSelected={closeRemainder}
                    onChange={setCloseRemainder}
                  >
                    <Label>
                      <span className="text-sm">
                        {t("modal.closeRemainder", {
                          amount: euro(remainder),
                        })}
                      </span>
                    </Label>
                  </Checkbox>
                ) : null}
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={close}
                  variant={actionVariant("default", "light")}
                >
                  {t("modal.cancel")}
                </Button>
                <Button
                  isDisabled={isSubmitDisabled()}
                  onPress={submit}
                  variant={actionVariant("primary", "solid")}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" tone="current" /> : null}
                  {t("modal.submit")}
                </Button>
              </Dialog.Footer>
            </>
          ) : null
        }
      </Dialog>

      <Dialog
        isOpen={reversingRow !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setReversingRow(null);
            setReverseReason("");
          }
        }}
        size="md"
        className="w-full max-w-md"
      >
        {({ close }) =>
          reversingRow ? (
            <>
              <DialogDismissButton />
              <Dialog.Header className="flex flex-col gap-1">
                <Dialog.Heading>{t("reverseModal.title")}</Dialog.Heading>
                <span className="text-sm font-normal text-ink-500">
                  {day(reversingRow.bookingDate)} ·{" "}
                  {reversingRow.counterpartyName ?? t("unknownParty")} ·{" "}
                  {euro(reversingRow.amountCents)}
                </span>
              </Dialog.Header>
              <Dialog.Body className="gap-3">
                <p className="text-xs text-ink-600">{t("reverseModal.description")}</p>
                <TextField
                  id="bank-reverse-reason"
                  value={reverseReason}
                  onChange={setReverseReason}
                  isRequired
                >
                  <Label>{t("reverseModal.reasonLabel")}</Label>
                  <TextArea rows={3} placeholder={t("reverseModal.reasonPlaceholder")} />
                </TextField>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onPress={close} variant={actionVariant("default", "light")}>
                  {t("modal.cancel")}
                </Button>
                <Button
                  isDisabled={reverseReason.trim().length < 5}
                  onPress={submitReverse}
                  variant={actionVariant("danger", "solid")}
                  isPending={reversingBusy}
                >
                  {reversingBusy ? <Spinner size="sm" tone="current" /> : null}
                  {t("reverseModal.submit")}
                </Button>
              </Dialog.Footer>
            </>
          ) : null
        }
      </Dialog>
    </>
  );
}
