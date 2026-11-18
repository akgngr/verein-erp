"use client";

import { notify } from "@/shared/components/ui/notify";
import { Dialog, Input, Label, Spinner, StatusChip, TextField, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { AlertTriangle, Calculator, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import {
  approvePayoutAction,
  cancelPayoutAction,
  generatePayoutsAction,
  markPayoutPaidAction,
} from "../actions/payout-actions";

export type PayoutPanelRow = {
  id: string;
  teacherName: string;
  period: string;
  status: "DRAFT" | "APPROVED" | "PAID" | "CANCELLED";
  number: string | null;
  compensation: string;
  sessionCount: number;
  minutes: number;
  amountCents: number;
  bookingNumber: string | null;
  paidAt: string | null;
  hasPaymentProfile: boolean;
  limitExceeded: boolean;
};

const STATUS_COLOR = {
  DRAFT: "default",
  APPROVED: "primary",
  PAID: "success",
  CANCELLED: "danger",
} as const;

/** Dönem seçimi, hesaplama ve hakediş satırları (onay → ödendi → iptal). */
export function PayoutsPanel({
  period,
  rows,
  canManage,
  canApprove,
}: {
  period: string;
  rows: PayoutPanelRow[];
  canManage: boolean;
  canApprove: boolean;
}) {
  const t = useTranslations("courses.payouts");
  const format = useFormatter();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<PayoutPanelRow | null>(null);
  const [cancelFor, setCancelFor] = useState<PayoutPanelRow | null>(null);
  const [paidAt, setPaidAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState("");
  const money = (cents: number) =>
    format.number(cents / 100, { style: "currency", currency: "EUR" });

  const call = async <T,>(
    key: string,
    fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>,
    success: (data: T) => string,
  ) => {
    setBusy(key);
    const response = await fn();
    setBusy(null);
    if (!response.ok) {
      notify.error(response.error);
      return false;
    }
    notify.success(success(response.data));
    router.refresh();
    return true;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          value={period}
          onChange={(value) =>
            value && router.push(`/kurslar/hakedisler?donem=${value}`)
          }
          className={["max-w-[12rem]"].filter(Boolean).join(" ")}
        >
          <Label>{t("period")}</Label>
          <Input type="month" />
        </TextField>
        {canManage ? (
          <Button
            onPress={() =>
              call(
                "generate",
                () => generatePayoutsAction({ period }),
                (data) => t("generated", data),
              )
            }
            variant={actionVariant("primary", "solid")}
            isPending={busy === "generate"}
          >
            {busy === "generate" ? <Spinner size="sm" tone="current" /> : null}
            {<Calculator size={16} />}
            {t("generate")}
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-500">
                <th className="px-3 py-2">{t("columns.teacher")}</th>
                <th className="px-3 py-2">{t("columns.type")}</th>
                <th className="px-3 py-2 text-right">
                  {t("columns.sessions")}
                </th>
                <th className="px-3 py-2 text-right">{t("columns.amount")}</th>
                <th className="px-3 py-2">{t("columns.status")}</th>
                <th className="px-3 py-2 text-right">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-ink-100 align-middle"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.teacherName}</div>
                    <div className="text-xs text-ink-500">
                      {row.number ?? t("noNumber")}
                    </div>
                    {!row.hasPaymentProfile ? (
                      <div className="flex items-center gap-1 text-xs text-warning-600">
                        <AlertTriangle size={12} /> {t("noProfile")}
                      </div>
                    ) : null}
                    {row.limitExceeded ? (
                      <div className="flex items-center gap-1 text-xs text-danger">
                        <AlertTriangle size={12} /> {t("limitExceeded")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-ink-600">
                    {t(`compensations.${row.compensation}` as never)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.sessionCount}
                    <div className="text-xs text-ink-500">
                      {t("hours", {
                        hours: format.number(row.minutes / 60, {
                          maximumFractionDigits: 2,
                        }),
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {money(row.amountCents)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusChip tone={STATUS_COLOR[row.status]}
                    >
                      {t(`status.${row.status}`)}
                    </StatusChip>
                    {row.bookingNumber ? (
                      <div className="text-xs text-ink-500">
                        {row.bookingNumber}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {row.status !== "CANCELLED" ? (
                        <ActionLink
                          href={`/api/courses/payouts/pdf?id=${row.id}`}
                          target="_blank"
                          className={buttonClassName({
                            variant: actionVariant("default", "flat"),
                            size: "sm",
                          })}
                        >
                          {<FileText size={14} />}
                          {t("pdf")}
                        </ActionLink>
                      ) : null}
                      {canApprove && row.status === "DRAFT" ? (
                        <Button
                          size="sm"
                          onPress={() =>
                            call(
                              `a${row.id}`,
                              () => approvePayoutAction({ id: row.id }),
                              (data) => t("approved", data),
                            )
                          }
                          variant={actionVariant("primary", "flat")}
                          isPending={busy === `a${row.id}`}
                        >
                          {busy === `a${row.id}` ? (
                            <Spinner size="sm" tone="current" />
                          ) : null}
                          {t("approve")}
                        </Button>
                      ) : null}
                      {canManage && row.status === "APPROVED" ? (
                        <Button
                          size="sm"
                          onPress={() => setPayFor(row)}
                          variant={actionVariant("success", "flat")}
                        >
                          {t("markPaid")}
                        </Button>
                      ) : null}
                      {canManage && row.status !== "CANCELLED" ? (
                        <Button
                          size="sm"
                          onPress={() => {
                            setReason("");
                            setCancelFor(row);
                          }}
                          variant={actionVariant("danger", "light")}
                        >
                          {row.status === "DRAFT" ? t("delete") : t("cancel")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        isOpen={payFor !== null}
        onOpenChange={(open) => !open && setPayFor(null)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {t("markPaidTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                <p className="text-sm text-ink-600">
                  {payFor
                    ? t("markPaidText", {
                        amount: money(payFor.amountCents),
                        name: payFor.teacherName,
                      })
                    : null}
                </p>
                <TextField
                  value={paidAt}
                  onChange={setPaidAt}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("paidAt")}</Label>
                  <Input type="date" />
                </TextField>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setPayFor(null)}
                  variant={actionVariant("default", "light")}
                >
                  {t("close")}
                </Button>
                <Button
                  onPress={async () => {
                    if (!payFor) return;
                    if (
                      await call(
                        "pay",
                        () => markPayoutPaidAction({ id: payFor.id, paidAt }),
                        (data) => t("paid", data),
                      )
                    )
                      setPayFor(null);
                  }}
                  variant={actionVariant("success", "solid")}
                  isPending={busy === "pay"}
                >
                  {busy === "pay" ? (
                    <Spinner size="sm" tone="current" />
                  ) : null}
                  {t("markPaid")}
                </Button>
              </Dialog.Footer>
      </Dialog>
      <Dialog
        isOpen={cancelFor !== null}
        onOpenChange={(open) => !open && setCancelFor(null)} size="md" className={"w-full max-w-md "}>
              <DialogDismissButton />

              <Dialog.Header>
                <Dialog.Heading className="flex items-center gap-2">
                  {cancelFor?.status === "DRAFT"
                    ? t("deleteTitle")
                    : t("cancelTitle")}
                </Dialog.Heading>
              </Dialog.Header>
              <Dialog.Body>
                <p className="text-sm text-ink-600">
                  {cancelFor?.status === "PAID"
                    ? t("cancelPaidText")
                    : t("cancelText")}
                </p>
                <TextField
                  value={reason}
                  onChange={setReason}
                  className={["w-full"].filter(Boolean).join(" ")}
                >
                  <Label>{t("reason")}</Label>
                  <Input />
                </TextField>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  onPress={() => setCancelFor(null)}
                  variant={actionVariant("default", "light")}
                >
                  {t("close")}
                </Button>
                <Button
                  onPress={async () => {
                    if (!cancelFor) return;
                    if (
                      await call(
                        "cancel",
                        () => cancelPayoutAction({ id: cancelFor.id, reason }),
                        () => t("cancelled"),
                      )
                    )
                      setCancelFor(null);
                  }}
                  variant={actionVariant("danger", "solid")}
                  isPending={busy === "cancel"}
                >
                  {busy === "cancel" ? (
                    <Spinner size="sm" tone="current" />
                  ) : null}
                  {cancelFor?.status === "DRAFT" ? t("delete") : t("cancel")}
                </Button>
              </Dialog.Footer>
      </Dialog>
    </div>
  );
}
