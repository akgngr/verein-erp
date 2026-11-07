"use client";

import { Button, Chip, Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/react";
import { HandCoins, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { GrantForm, type GRANT_STATUSES } from "./grant-form";

type Row = { id: string; name: string; funder: string; fileNumber: string | null; status: (typeof GRANT_STATUSES)[number]; approvedCents: number | null; periodStart: string; periodEnd: string; reportDueAt: string | null; receivedCents: number; reportSubmittedAt: string | null };
const COLOR = { PLANNED: "default", APPLIED: "secondary", APPROVED: "primary", ACTIVE: "primary", REPORTED: "success", CLOSED: "default", REJECTED: "danger" } as const;

export function GrantsList({ rows, projects, canCreate, today }: { rows: Row[]; projects: { id: string; name: string }[]; canCreate: boolean; today: string }) {
  const t = useTranslations("grants");
  const format = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const money = (cents: number | null) => (cents === null ? "—" : format.number(cents / 100, { style: "currency", currency: "EUR" }));
  const date = (value: string | null) => (value ? format.dateTime(new Date(`${value}T12:00:00`), { dateStyle: "medium" }) : "—");
  return (
    <div className="flex flex-col gap-4">
      {canCreate ? <Button color="primary" className="self-start" startContent={<Plus className="size-4" />} onPress={() => setOpen(true)}>{t("newGrant")}</Button> : null}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-large border border-dashed border-default-300 p-10 text-center text-default-500"><HandCoins className="size-8" /><p>{t("empty")}</p></div>
      ) : (
        <div className="overflow-x-auto rounded-large border border-default-200">
          <table className="w-full text-small">
            <thead className="bg-default-50 text-default-500"><tr>{(["name", "funder", "period", "approved", "received", "reportDue", "status"] as const).map((key) => <th key={key} className="px-3 py-2 text-start font-medium">{t(`columns.${key}`)}</th>)}</tr></thead>
            <tbody>
              {rows.map((row) => {
                const overdue = row.reportDueAt && !row.reportSubmittedAt && row.reportDueAt < today;
                return (
                  <tr key={row.id} className="border-t border-default-100">
                    <td className="px-3 py-2"><Link className="font-medium text-primary hover:underline" href={`/hibeler/${row.id}`}>{row.name}</Link>{row.fileNumber ? <span className="block text-tiny text-default-500">{row.fileNumber}</span> : null}</td>
                    <td className="px-3 py-2">{row.funder}</td>
                    <td className="px-3 py-2 text-default-600">{date(row.periodStart)} – {date(row.periodEnd)}</td>
                    <td className="px-3 py-2">{money(row.approvedCents)}</td>
                    <td className="px-3 py-2">{money(row.receivedCents)}</td>
                    <td className={`px-3 py-2 ${overdue ? "font-medium text-danger" : ""}`}>{row.reportSubmittedAt ? t("submitted") : date(row.reportDueAt)}</td>
                    <td className="px-3 py-2"><Chip size="sm" variant="flat" color={COLOR[row.status]}>{t(`status.${row.status}`)}</Chip></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={open} onOpenChange={setOpen} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{t("newGrant")}</ModalHeader>
          <ModalBody className="pb-6">
            <GrantForm canEdit projects={projects} initial={{ id: null, name: "", funder: "", fileNumber: null, purpose: null, status: "PLANNED", approvedCents: null, ownShareCents: 0, thirdPartyCents: 0, periodStart: today, periodEnd: today, reportDueAt: null, projectId: null, useNetAmounts: false }} onSaved={(id) => router.push(`/hibeler/${id}`)} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
