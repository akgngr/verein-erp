"use client";
import { statusStyle } from "@/shared/components/ui/status-appearance";
import {
  toast,
  Chip,
  Button,
  Spinner,
  Modal,
  TextField,
  Label,
  Input,
  TextArea,
} from "@heroui/react";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";
import { statusTone } from "@/shared/components/ui/status-appearance";

import { Ban, Coins, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable } from "@/shared/components/data-table/data-table";
import type { DataTableColumn } from "@/shared/components/data-table/types";
import { formatMoney } from "@/shared/money";
import { formatDate } from "@/shared/utils";

import {
  recordPaymentAction,
  reversePaymentAction,
  waiveChargeAction,
} from "../actions/fee-actions";
import { CHARGE_STATUS_VALUES, PAYMENT_METHOD_VALUES } from "../constants";
import type {
  ChargeRow,
  CourseChargeStatus,
  CoursePaymentMethod,
} from "../types";

const STATUS_COLOR: Record<
  CourseChargeStatus,
  "warning" | "success" | "default" | "danger"
> = {
  OPEN: "warning",
  PAID: "success",
  WAIVED: "default",
  CANCELLED: "default",
};

type Dialog =
  | {
      type: "pay";
      charge: ChargeRow;
      paidAt: string;
      method: CoursePaymentMethod;
      reference: string;
    }
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
      ? t("labelMonth", {
          period: `${row.period.slice(5)}/${row.period.slice(0, 4)}`,
        })
      : row.kind === "INSTALLMENT"
        ? t("labelInstallment", { sequence: row.sequence, total: row.total })
        : t("labelOnce");

  const columns: DataTableColumn<ChargeRow>[] = [
    ...(showCourse
      ? [
          {
            key: "course",
            label: t("course"),
            render: (row: ChargeRow) => row.courseCode,
          },
        ]
      : []),
    {
      key: "student",
      label: t("student"),
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.studentLabel}</span>
          <span className="text-xs text-ink-500">
            {row.payerLabel
              ? `${row.payerLabel} · ${row.payerDebtorNumber}`
              : "—"}
          </span>
        </div>
      ),
    },
    { key: "label", label: t("item"), render: chargeLabel },
    {
      key: "dueDate",
      label: t("dueDate"),
      sortable: true,
      render: (row) => (
        <span className={row.isOverdue ? "font-medium text-danger-600" : ""}>
          {formatDate(row.dueDate)}
        </span>
      ),
    },
    {
      key: "amountCents",
      label: t("amount"),
      sortable: true,
      align: "end",
      render: (row) => formatMoney(row.amountCents),
    },
    {
      key: "status",
      label: t("status"),
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <Chip
            size="sm"
            color={statusTone(
              row.isOverdue ? "danger" : STATUS_COLOR[row.status],
            )}
            variant={"soft"}
            style={statusStyle(
              row.isOverdue ? "danger" : STATUS_COLOR[row.status],
            )}
          >
            {row.isOverdue ? t("overdue") : tEnum(`chargeStatus.${row.status}`)}
          </Chip>
          {row.payment ? (
            <span className="text-xs text-ink-500">
              {formatDate(row.payment.paidAt)} ·{" "}
              {tEnum(`paymentMethod.${row.payment.method}`)}
              {row.payment.bookingNumber
                ? ` · ${row.payment.bookingNumber}`
                : ""}
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
        ? await recordPaymentAction({
            chargeId: dialog.charge.id,
            paidAt: dialog.paidAt,
            method: dialog.method,
            reference: dialog.reference,
          })
        : dialog.type === "reverse"
          ? await reversePaymentAction({
              paymentId: dialog.charge.payment?.id,
              reason: dialog.reason,
            })
          : await waiveChargeAction({
              chargeId: dialog.charge.id,
              reason: dialog.reason,
            });
    setBusy(false);
    if (!result.ok) {
      const fieldError = result.fieldErrors
        ? Object.values(result.fieldErrors)[0]?.[0]
        : undefined;
      setError(fieldError ?? result.error);
      return;
    }
    toast(
      "bookingNumber" in result.data
        ? t("paidToast", { booking: String(result.data.bookingNumber) })
        : dialog.type === "reverse"
          ? t("reversedToast")
          : t("waivedToast"),
      { variant: "success" },
    );
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
          {
            key: "status",
            label: t("status"),
            options: [
              { value: "ALL", label: t("all") },
              ...CHARGE_STATUS_VALUES.map((value) => ({
                value,
                label: tEnum(`chargeStatus.${value}`),
              })),
            ],
          },
          {
            key: "overdue",
            label: t("overdue"),
            options: [{ value: "1", label: t("onlyOverdue") }],
          },
        ]}
        topRightExtra={
          <span className="text-sm text-ink-600">
            {t("openTotal", { amount: formatMoney(openTotalCents) })}
          </span>
        }
        emptyMessage={t("empty")}
        rowActions={(row) => [
          {
            key: "pay",
            label: t("pay"),
            icon: <Coins className="h-4 w-4" />,
            onPress: () =>
              setDialog({
                type: "pay",
                charge: row,
                paidAt: today,
                method: "BANK_TRANSFER",
                reference: "",
              }),
            hidden: !canPay || row.status !== "OPEN",
          },
          {
            key: "waive",
            label: t("waive"),
            icon: <Ban className="h-4 w-4" />,
            onPress: () =>
              setDialog({ type: "waive", charge: row, reason: "" }),
            hidden: !canManage || row.status !== "OPEN",
          },
          {
            key: "reverse",
            label: t("reverse"),
            icon: <Undo2 className="h-4 w-4" />,
            color: "danger",
            onPress: () =>
              setDialog({ type: "reverse", charge: row, reason: "" }),
            hidden: !canManage || row.status !== "PAID" || !row.payment,
          },
        ]}
      />
      <Modal
        isOpen={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Modal.Header>
                <Modal.Heading className="flex items-center gap-2">
                  {dialog ? t(`${dialog.type}Title`) : null}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {dialog ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm">
                      <span className="font-medium">
                        {dialog.charge.studentLabel}
                      </span>{" "}
                      · {chargeLabel(dialog.charge)} ·{" "}
                      {formatMoney(dialog.charge.amountCents)}
                    </p>
                    {dialog.type === "pay" ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <TextField
                            value={dialog.paidAt}
                            onChange={(paidAt) =>
                              setDialog({ ...dialog, paidAt })
                            }
                            className={["w-full"].filter(Boolean).join(" ")}
                          >
                            <Label>{t("paidAt")}</Label>
                            <Input type="date" placeholder=" " />
                          </TextField>
                          <label className="flex flex-col gap-1 text-sm">
                            <span>{t("method")}</span>
                            <select
                              className="h-10 rounded-lg border border-ink-200 bg-ink-50/50 px-3 text-sm"
                              value={dialog.method}
                              onChange={(event) =>
                                setDialog({
                                  ...dialog,
                                  method: event.target
                                    .value as CoursePaymentMethod,
                                })
                              }
                            >
                              {PAYMENT_METHOD_VALUES.map((method) => (
                                <option key={method} value={method}>
                                  {tEnum(`paymentMethod.${method}`)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <TextField
                          value={dialog.reference}
                          onChange={(reference) =>
                            setDialog({ ...dialog, reference })
                          }
                          className={["w-full"].filter(Boolean).join(" ")}
                        >
                          <Label>{t("reference")}</Label>
                          <Input placeholder=" " maxLength={80} />
                        </TextField>
                        <p className="text-xs text-ink-500">{t("payHelp")}</p>
                      </>
                    ) : (
                      <TextField
                        value={dialog.reason}
                        isRequired
                        onChange={(reason) => setDialog({ ...dialog, reason })}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("reason")}</Label>
                        <TextArea
                          maxLength={300}
                          rows={2}
                          className={["[field-sizing:content]"]
                            .filter(Boolean)
                            .join(" ")}
                        />
                      </TextField>
                    )}
                    {error ? (
                      <p className="text-sm text-danger">{error}</p>
                    ) : null}
                  </div>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  onPress={() => setDialog(null)}
                  variant={actionVariant("default", "light")}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  onPress={submit}
                  variant={actionVariant(
                    dialog?.type === "reverse" ? "danger" : "primary",
                    "solid",
                  )}
                  isPending={busy}
                >
                  {busy ? <Spinner size="sm" color="current" /> : null}
                  {dialog ? t(`${dialog.type}Confirm`) : null}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
