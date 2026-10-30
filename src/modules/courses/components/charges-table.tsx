"use client";

import { addToast, Button, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Textarea } from "@heroui/react";
import { Ban, Coins, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { formatMoney } from "@/shared/money";
import { formatDate } from "@/shared/utils";

import { recordPaymentAction, reversePaymentAction, waiveChargeAction } from "../actions/fee-actions";
import { CHARGE_STATUS_VALUES, PAYMENT_METHOD_VALUES } from "../constants";
import type { ChargeRow, CourseChargeStatus, CoursePaymentMethod } from "../types";

const STATUS_COLOR: Record<CourseChargeStatus, "warning" | "success" | "default" | "danger"> = { OPEN: "warning", PAID: "success", WAIVED: "default", CANCELLED: "default" };

type Dialog =
  | { type: "pay"; charge: ChargeRow; paidAt: string; method: CoursePaymentMethod; reference: string }
  | { type: "reverse"; charge: ChargeRow; reason: string }
  | { type: "waive"; charge: ChargeRow; reason: string };

/** Ücret kalemleri: tahsil et (muhasebe fişi), tahsilatı geri al, feragat et. */
export function ChargesTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q,
  openTotalCents,
  canPay,
  canManage,
  showCourse,
  today,
}: {
  rows: ChargeRow[];
  total: number;
  page: number;
  pageSize: number;
  sort?: string;
  dir?: "asc" | "desc";
  q?: string;
  openTotalCents: number;
  canPay: boolean;
  canManage: boolean;
  showCourse: boolean;
  today: string;
}) {
  const t = useTranslations("courses.charges");
  const tEnum = useTranslations("courses.enums");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chargeLabel = (row: ChargeRow) =>
    row.kind === "MONTH" && row.period
      ? t("labelMonth", { period: `${row.period.slice(5)}/${row.period.slice(0, 4)}` })
      : row.kind === "INSTALLMENT"
        ? t("labelInstallment", { sequence: row.sequence, total: row.total })
        : t("labelOnce");

  const columns: DataTableColumn<ChargeRow>[] = [
    ...(showCourse ? [{ key: "course", label: t("course"), render: (row: ChargeRow) => row.courseCode }] : []),
    {
      key: "student",
      label: t("student"),
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.studentLabel}</span>
          <span className="text-tiny text-default-500">{row.payerLabel ? `${row.payerLabel} · ${row.payerDebtorNumber}` : "—"}</span>
        </div>
      ),
    },
    { key: "label", label: t("item"), render: chargeLabel },
    {
      key: "dueDate",
      label: t("dueDate"),
      sortable: true,
      render: (row) => <span className={row.isOverdue ? "font-medium text-danger-600" : ""}>{formatDate(row.dueDate)}</span>,
    },
    { key: "amountCents", label: t("amount"), sortable: true, align: "end", render: (row) => formatMoney(row.amountCents) },
    {
      key: "status",
      label: t("status"),
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <Chip size="sm" variant="flat" color={row.isOverdue ? "danger" : STATUS_COLOR[row.status]}>
            {row.isOverdue ? t("overdue") : tEnum(`chargeStatus.${row.status}`)}
          </Chip>
          {row.payment ? (
            <span className="text-tiny text-default-500">
              {formatDate(row.payment.paidAt)} · {tEnum(`paymentMethod.${row.payment.method}`)}
              {row.payment.bookingNumber ? ` · ${row.payment.bookingNumber}` : ""}
            </span>
          ) : null}
        </div>
      ),
    },
  ];

  const submit = async () => {
    if (!dialog) return;
    setBusy(true);
    setError(null);
    const result =
      dialog.type === "pay"
        ? await recordPaymentAction({ chargeId: dialog.charge.id, paidAt: dialog.paidAt, method: dialog.method, reference: dialog.reference })
        : dialog.type === "reverse"
          ? await reversePaymentAction({ paymentId: dialog.charge.payment?.id, reason: dialog.reason })
          : await waiveChargeAction({ chargeId: dialog.charge.id, reason: dialog.reason });
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0]?.[0] : undefined;
      setError(fieldError ?? result.error);
      return;
    }
    addToast({
      title: "bookingNumber" in result.data ? t("paidToast", { booking: String(result.data.bookingNumber) }) : dialog.type === "reverse" ? t("reversedToast") : t("waivedToast"),
      color: "success",
    });
    setDialog(null);
    router.refresh();
  };

  return (
    <>
      <DataTable<ChargeRow>
        ariaLabel={t("aria")}
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        sort={sort}
        dir={dir}
        q={q}
        searchPlaceholder={t("search")}
        filters={[
          { key: "status", label: t("status"), options: [{ value: "ALL", label: t("all") }, ...CHARGE_STATUS_VALUES.map((value) => ({ value, label: tEnum(`chargeStatus.${value}`) }))] },
          { key: "overdue", label: t("overdue"), options: [{ value: "1", label: t("onlyOverdue") }] },
        ]}
        topRightExtra={<span className="text-small text-default-600">{t("openTotal", { amount: formatMoney(openTotalCents) })}</span>}
        emptyMessage={t("empty")}
        rowActions={(row) => [
          {
            key: "pay",
            label: t("pay"),
            icon: <Coins className="h-4 w-4" />,
            onPress: () => setDialog({ type: "pay", charge: row, paidAt: today, method: "BANK_TRANSFER", reference: "" }),
            hidden: !canPay || row.status !== "OPEN",
          },
          {
            key: "waive",
            label: t("waive"),
            icon: <Ban className="h-4 w-4" />,
            onPress: () => setDialog({ type: "waive", charge: row, reason: "" }),
            hidden: !canManage || row.status !== "OPEN",
          },
          {
            key: "reverse",
            label: t("reverse"),
            icon: <Undo2 className="h-4 w-4" />,
            color: "danger",
            onPress: () => setDialog({ type: "reverse", charge: row, reason: "" }),
            hidden: !canManage || row.status !== "PAID" || !row.payment,
          },
        ]}
      />
      <Modal isOpen={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <ModalContent>
          <ModalHeader>{dialog ? t(`${dialog.type}Title`) : null}</ModalHeader>
          <ModalBody>
            {dialog ? (
              <div className="flex flex-col gap-3">
                <p className="text-small">
                  <span className="font-medium">{dialog.charge.studentLabel}</span> · {chargeLabel(dialog.charge)} · {formatMoney(dialog.charge.amountCents)}
                </p>
                {dialog.type === "pay" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="date" label={t("paidAt")} labelPlacement="outside" placeholder=" " value={dialog.paidAt} onValueChange={(paidAt) => setDialog({ ...dialog, paidAt })} />
                      <label className="flex flex-col gap-1 text-small">
                        <span>{t("method")}</span>
                        <select
                          className="h-10 rounded-medium border border-default-200 bg-default-50/50 px-3 text-small"
                          value={dialog.method}
                          onChange={(event) => setDialog({ ...dialog, method: event.target.value as CoursePaymentMethod })}
                        >
                          {PAYMENT_METHOD_VALUES.map((method) => (
                            <option key={method} value={method}>
                              {tEnum(`paymentMethod.${method}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <Input label={t("reference")} labelPlacement="outside" placeholder=" " value={dialog.reference} onValueChange={(reference) => setDialog({ ...dialog, reference })} maxLength={80} />
                    <p className="text-tiny text-default-500">{t("payHelp")}</p>
                  </>
                ) : (
                  <Textarea label={t("reason")} labelPlacement="outside" value={dialog.reason} onValueChange={(reason) => setDialog({ ...dialog, reason })} minRows={2} maxLength={300} isRequired />
                )}
                {error ? <p className="text-small text-danger">{error}</p> : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDialog(null)}>
              {tCommon("cancel")}
            </Button>
            <Button color={dialog?.type === "reverse" ? "danger" : "primary"} isLoading={busy} onPress={submit}>
              {dialog ? t(`${dialog.type}Confirm`) : null}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
