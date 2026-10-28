"use client";

import {
  Button,
  DatePicker,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Textarea,
  addToast,
} from "@heroui/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { parseDate, type DateValue } from "@internationalized/date";

import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatMoney } from "@/shared/money";

import { addDueAction, deleteDueAction, updateDueAction } from "../actions/dues-actions";
import type { DueRow } from "../types";
import { DuesStatusBadge } from "./dues-status-badge";

/**
 * Üye detay aidat satırları paneli (Faz 3 eklemeleri): yıllık beklenen tutar,
 * ödenen (ödeme kayıtlarından), kalan, durum; ekleme/düzenleme/muafiyet/silme.
 * Ödemelerin kendisi PaymentsPanel'dedir — bu panel yalnız aidat satırlarını
 * yönetir. Durum; ödeme ekleme/iptalinde sunucuda otomatik yeniden hesaplanır.
 */
export function DuesPanel({
  memberId,
  dues,
  canCreate,
  canUpdate,
}: {
  memberId: string;
  dues: DueRow[];
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const t = useTranslations("members.dues.panel");
  const router = useRouter();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DueRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DueRow | null>(null);

  // Form durumu (ekleme ve düzenleme ortak alanlar)
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [waived, setWaived] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setYear(String(new Date().getFullYear()));
    setAmount("");
    setDueDate("");
    setNote("");
    setWaived(false);
    setFormError(null);
    setAddOpen(true);
  };

  const openEdit = (row: DueRow) => {
    setEditTarget(row);
    setAmount((row.amountDueCents / 100).toFixed(2).replace(".", ","));
    setDueDate(row.dueDate);
    setNote(row.note ?? "");
    setWaived(row.status === "WAIVED");
    setFormError(null);
  };

  const submitAdd = async () => {
    setFormError(null);
    setSaving(true);
    try {
      const result = await addDueAction({ memberId, year, amount, dueDate, note });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      addToast({ title: t("toastAdded"), color: "success" });
      setAddOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    setFormError(null);
    setSaving(true);
    try {
      const result = await updateDueAction({
        id: editTarget.id,
        amount,
        dueDate,
        note,
        waived,
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      addToast({ title: t("toastUpdated"), color: "success" });
      setEditTarget(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteDueAction({ id: deleteTarget.id });
    if (!result.ok) {
      addToast({ title: result.error, color: "danger" });
      return;
    }
    addToast({ title: t("toastDeleted"), color: "success" });
    setDeleteTarget(null);
    router.refresh();
  };

  return (
    <div className="rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">
          {t("title")}
        </h2>
        {canCreate ? (
          <Button
            size="sm"
            color="primary"
            variant="flat"
            startContent={<Plus className="h-4 w-4" aria-hidden />}
            onPress={openAdd}
          >
            {t("add")}
          </Button>
        ) : null}
      </div>

      {dues.length === 0 ? (
        <p className="text-small text-default-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-small" aria-label={t("title")}>
            <thead>
              <tr className="border-b border-default-200 text-left text-tiny uppercase tracking-wide text-default-400">
                <th className="py-2 pr-3">{t("colYear")}</th>
                <th className="py-2 pr-3">{t("colAmountDue")}</th>
                <th className="py-2 pr-3">{t("colPaid")}</th>
                <th className="py-2 pr-3">{t("colRemaining")}</th>
                <th className="py-2 pr-3">{t("colStatus")}</th>
                <th className="py-2 pr-3">{t("colDueDate")}</th>
                <th className="py-2 pr-3">{t("colNote")}</th>
                <th className="py-2" aria-label="" />
              </tr>
            </thead>
            <tbody>
              {dues.map((row) => (
                <tr key={row.id} className="border-b border-default-100 last:border-none">
                  <td className="py-2 pr-3 font-medium">{row.year}</td>
                  <td className="py-2 pr-3">{formatMoney(row.amountDueCents)}</td>
                  <td className="py-2 pr-3">{formatMoney(row.paidCents)}</td>
                  <td className={`py-2 pr-3${row.remainingCents > 0 ? " font-medium text-warning-600" : ""}`}>
                    {formatMoney(row.remainingCents)}
                  </td>
                  <td className="py-2 pr-3">
                    <DuesStatusBadge status={row.status} />
                    {row.overdue ? (
                      <span className="ml-2 text-tiny font-medium text-danger">{t("overdue")}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">{row.dueDate}</td>
                  <td className="max-w-48 truncate py-2 pr-3" title={row.note ?? undefined}>
                    {row.note ?? "-"}
                  </td>
                  <td className="py-2">
                    {canUpdate ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          aria-label={t("edit")}
                          onPress={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          aria-label={t("delete")}
                          onPress={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ekleme modalı */}
      <Modal isOpen={addOpen} onOpenChange={(next) => setAddOpen(next)} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("addTitle")}</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label={t("colYear")}
                    labelPlacement="outside"
                    type="number"
                    min={2000}
                    max={new Date().getFullYear() + 1}
                    value={year}
                    onValueChange={setYear}
                  />
                  <Input
                    label={t("colAmountDue")}
                    labelPlacement="outside"
                    placeholder="0,00"
                    value={amount}
                    onValueChange={setAmount}
                  />
                  <DatePicker
                    label={t("colDueDate")}
                    labelPlacement="outside"
                    value={dueDate ? (parseDate(dueDate) as DateValue) : null}
                    onChange={(next) => setDueDate(next ? next.toString() : "")}
                  />
                  <Textarea
                    label={t("colNote")}
                    labelPlacement="outside"
                    maxLength={300}
                    value={note}
                    onValueChange={setNote}
                  />
                </div>
                {formError ? <p className="text-small text-danger">{formError}</p> : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button color="primary" isLoading={saving} onPress={submitAdd}>
                  {t("save")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Düzenleme modalı */}
      <Modal isOpen={editTarget !== null} onOpenChange={(next) => !next && setEditTarget(null)} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{t("editTitle", { year: editTarget?.year ?? "" })}</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label={t("colAmountDue")}
                    labelPlacement="outside"
                    placeholder="0,00"
                    value={amount}
                    onValueChange={setAmount}
                  />
                  <DatePicker
                    label={t("colDueDate")}
                    labelPlacement="outside"
                    value={dueDate ? (parseDate(dueDate) as DateValue) : null}
                    onChange={(next) => setDueDate(next ? next.toString() : "")}
                  />
                  <Textarea
                    label={t("colNote")}
                    labelPlacement="outside"
                    maxLength={300}
                    value={note}
                    onValueChange={setNote}
                  />
                  <div className="flex items-end pb-2">
                    <Switch isSelected={waived} onValueChange={setWaived} size="sm">
                      {t("waived")}
                    </Switch>
                  </div>
                </div>
                {editTarget ? (
                  <p className="text-tiny text-default-400">
                    {t("paidInfo", { paid: formatMoney(editTarget.paidCents) })}
                  </p>
                ) : null}
                {formError ? <p className="text-small text-danger">{formError}</p> : null}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  {t("cancel")}
                </Button>
                <Button color="primary" isLoading={saving} onPress={submitEdit}>
                  {t("save")}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteTitle")}
        message={t("deleteMessage", { year: deleteTarget?.year ?? "" })}
        confirmLabel={t("delete")}
        confirmColor="danger"
        onConfirm={submitDelete}
      />
    </div>
  );
}
