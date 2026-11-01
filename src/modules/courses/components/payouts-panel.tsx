"use client";

import { addToast, Button, Chip, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { AlertTriangle, Calculator, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { approvePayoutAction, cancelPayoutAction, generatePayoutsAction, markPayoutPaidAction } from "../actions/payout-actions";

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

const STATUS_COLOR = { DRAFT: "default", APPROVED: "primary", PAID: "success", CANCELLED: "danger" } as const;

/** Dönem seçimi, hesaplama ve hakediş satırları (onay → ödendi → iptal). */
export function PayoutsPanel({ period, rows, canManage, canApprove }: { period: string; rows: PayoutPanelRow[]; canManage: boolean; canApprove: boolean }) {
  const t = useTranslations("courses.payouts");
  const format = useFormatter();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<PayoutPanelRow | null>(null);
  const [cancelFor, setCancelFor] = useState<PayoutPanelRow | null>(null);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const money = (cents: number) => format.number(cents / 100, { style: "currency", currency: "EUR" });

  const call = async <T,>(key: string, fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, success: (data: T) => string) => {
    setBusy(key);
    const response = await fn();
    setBusy(null);
    if (!response.ok) {
      addToast({ title: response.error, color: "danger" });
      return false;
    }
    addToast({ title: success(response.data), color: "success" });
    router.refresh();
    return true;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          type="month"
          label={t("period")}
          labelPlacement="outside"
          value={period}
          onValueChange={(value) => value && router.push(`/kurslar/hakedisler?donem=${value}`)}
          className="max-w-[12rem]"
        />
        {canManage ? (
          <Button
            color="primary"
            startContent={<Calculator size={16} />}
            isLoading={busy === "generate"}
            onPress={() => call("generate", () => generatePayoutsAction({ period }), (data) => t("generated", data))}
          >
            {t("generate")}
          </Button>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-small text-default-500">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-large border border-default-200 bg-content1">
          <table className="w-full text-small">
            <thead>
              <tr className="text-left text-tiny text-default-500">
                <th className="px-3 py-2">{t("columns.teacher")}</th>
                <th className="px-3 py-2">{t("columns.type")}</th>
                <th className="px-3 py-2 text-right">{t("columns.sessions")}</th>
                <th className="px-3 py-2 text-right">{t("columns.amount")}</th>
                <th className="px-3 py-2">{t("columns.status")}</th>
                <th className="px-3 py-2 text-right">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-default-100 align-middle">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.teacherName}</div>
                    <div className="text-tiny text-default-500">{row.number ?? t("noNumber")}</div>
                    {!row.hasPaymentProfile ? (
                      <div className="flex items-center gap-1 text-tiny text-warning-600">
                        <AlertTriangle size={12} /> {t("noProfile")}
                      </div>
                    ) : null}
                    {row.limitExceeded ? (
                      <div className="flex items-center gap-1 text-tiny text-danger">
                        <AlertTriangle size={12} /> {t("limitExceeded")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-default-600">{t(`compensations.${row.compensation}` as never)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.sessionCount}
                    <div className="text-tiny text-default-500">{t("hours", { hours: format.number(row.minutes / 60, { maximumFractionDigits: 2 }) })}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{money(row.amountCents)}</td>
                  <td className="px-3 py-2">
                    <Chip size="sm" variant="flat" color={STATUS_COLOR[row.status]}>
                      {t(`status.${row.status}`)}
                    </Chip>
                    {row.bookingNumber ? <div className="text-tiny text-default-500">{row.bookingNumber}</div> : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {row.status !== "CANCELLED" ? (
                        <Button as="a" href={`/api/courses/payouts/pdf?id=${row.id}`} target="_blank" size="sm" variant="flat" startContent={<FileText size={14} />}>
                          {t("pdf")}
                        </Button>
                      ) : null}
                      {canApprove && row.status === "DRAFT" ? (
                        <Button size="sm" color="primary" variant="flat" isLoading={busy === `a${row.id}`} onPress={() => call(`a${row.id}`, () => approvePayoutAction({ id: row.id }), (data) => t("approved", data))}>
                          {t("approve")}
                        </Button>
                      ) : null}
                      {canManage && row.status === "APPROVED" ? (
                        <Button size="sm" color="success" variant="flat" onPress={() => setPayFor(row)}>
                          {t("markPaid")}
                        </Button>
                      ) : null}
                      {canManage && row.status !== "CANCELLED" ? (
                        <Button size="sm" color="danger" variant="light" onPress={() => { setReason(""); setCancelFor(row); }}>
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
      <Modal isOpen={payFor !== null} onOpenChange={(open) => !open && setPayFor(null)}>
        <ModalContent>
          <ModalHeader>{t("markPaidTitle")}</ModalHeader>
          <ModalBody>
            <p className="text-small text-default-600">{payFor ? t("markPaidText", { amount: money(payFor.amountCents), name: payFor.teacherName }) : null}</p>
            <Input type="date" label={t("paidAt")} labelPlacement="outside" value={paidAt} onValueChange={setPaidAt} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setPayFor(null)}>
              {t("close")}
            </Button>
            <Button
              color="success"
              isLoading={busy === "pay"}
              onPress={async () => {
                if (!payFor) return;
                if (await call("pay", () => markPayoutPaidAction({ id: payFor.id, paidAt }), (data) => t("paid", data))) setPayFor(null);
              }}
            >
              {t("markPaid")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={cancelFor !== null} onOpenChange={(open) => !open && setCancelFor(null)}>
        <ModalContent>
          <ModalHeader>{cancelFor?.status === "DRAFT" ? t("deleteTitle") : t("cancelTitle")}</ModalHeader>
          <ModalBody>
            <p className="text-small text-default-600">{cancelFor?.status === "PAID" ? t("cancelPaidText") : t("cancelText")}</p>
            <Input label={t("reason")} labelPlacement="outside" value={reason} onValueChange={setReason} />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setCancelFor(null)}>
              {t("close")}
            </Button>
            <Button
              color="danger"
              isLoading={busy === "cancel"}
              onPress={async () => {
                if (!cancelFor) return;
                if (await call("cancel", () => cancelPayoutAction({ id: cancelFor.id, reason }), () => t("cancelled"))) setCancelFor(null);
              }}
            >
              {cancelFor?.status === "DRAFT" ? t("delete") : t("cancel")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
