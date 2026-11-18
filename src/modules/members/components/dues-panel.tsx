"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { DateInput, Dialog, Input, Label, Spinner, Switch, TextArea, TextField } from "@/shared/components/kit";

import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";


import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { formatMoney } from "@/shared/money";

import {
  addDueAction,
  deleteDueAction,
  updateDueAction,
} from "../actions/dues-actions";
import type { DueRow } from "../types";
import { DuesStatusBadge } from "./dues-status-badge";
import { describeActionError } from "@/shared/components/forms/action-result";

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
      const result = await addDueAction({
        memberId,
        year,
        amount,
        dueDate,
        note,
      });
      if (!result.ok) {
        setFormError(describeActionError(result));
        return;
      }
      notify.success(t("toastAdded"));
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
        setFormError(describeActionError(result));
        return;
      }
      notify.success(t("toastUpdated"));
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
      notify.error(describeActionError(result));
      return;
    }
    notify.success(t("toastDeleted"));
    setDeleteTarget(null);
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-ink-200 bg-surface p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          {t("title")}
        </h2>
        {canCreate ? (
          <Button
            size="sm"
            onPress={openAdd}
            variant={actionVariant("primary", "flat")}
          >
            {<Plus className="h-4 w-4" aria-hidden />}
            {t("add")}
          </Button>
        ) : null}
      </div>

      {dues.length === 0 ? (
        <p className="text-sm text-ink-400">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label={t("title")}>
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
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
                <tr
                  key={row.id}
                  className="border-b border-ink-100 last:border-none"
                >
                  <td className="py-2 pr-3 font-medium">{row.year}</td>
                  <td className="py-2 pr-3">
                    {formatMoney(row.amountDueCents)}
                  </td>
                  <td className="py-2 pr-3">{formatMoney(row.paidCents)}</td>
                  <td
                    className={`py-2 pr-3${row.remainingCents > 0 ? " font-medium text-warning-600" : ""}`}
                  >
                    {formatMoney(row.remainingCents)}
                  </td>
                  <td className="py-2 pr-3">
                    <DuesStatusBadge status={row.status} />
                    {row.overdue ? (
                      <span className="ml-2 text-xs font-medium text-danger">
                        {t("overdue")}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">{row.dueDate}</td>
                  <td
                    className="max-w-48 truncate py-2 pr-3"
                    title={row.note ?? undefined}
                  >
                    {row.note ?? "-"}
                  </td>
                  <td className="py-2">
                    {canUpdate ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          aria-label={t("edit")}
                          onPress={() => openEdit(row)}
                          variant={actionVariant("default", "light")}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          aria-label={t("delete")}
                          onPress={() => setDeleteTarget(row)}
                          variant={actionVariant("danger", "light")}
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
      <Dialog isOpen={addOpen} onOpenChange={(next) => setAddOpen(next)} size="lg" className={"w-full max-w-lg "}>
              {({ close: onClose }) => (
                <>
                  <DialogDismissButton />
                  <Dialog.Header>
                    <Dialog.Heading className="flex items-center gap-2">
                      {t("addTitle")}
                    </Dialog.Heading>
                  </Dialog.Header>
                  <Dialog.Body>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <TextField
                        value={year}
                        onChange={setYear}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("colYear")}</Label>
                        <Input
                          type="number"
                          min={2000}
                          max={new Date().getFullYear() + 1}
                        />
                      </TextField>
                      <TextField
                        value={amount}
                        onChange={setAmount}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("colAmountDue")}</Label>
                        <Input placeholder="0,00" />
                      </TextField>
                      <DateInput label={t("colDueDate")} ariaLabel={String(t("colDueDate"))} value={dueDate} onChange={setDueDate} />
                      <TextField
                        value={note}
                        onChange={setNote}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("colNote")}</Label>
                        <TextArea
                          maxLength={300}
                          rows={3}
                          className={["[field-sizing:content]"]
                            .filter(Boolean)
                            .join(" ")}
                        />
                      </TextField>
                    </div>
                    {formError ? (
                      <p className="text-sm text-danger">{formError}</p>
                    ) : null}
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Button
                      onPress={onClose}
                      variant={actionVariant("default", "light")}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      onPress={submitAdd}
                      variant={actionVariant("primary", "solid")}
                      isPending={saving}
                    >
                      {saving ? <Spinner size="sm" tone="current" /> : null}
                      {t("save")}
                    </Button>
                  </Dialog.Footer>
                </>
              )}
      </Dialog>

      {/* Düzenleme modalı */}
      <Dialog
        isOpen={editTarget !== null}
        onOpenChange={(next) => !next && setEditTarget(null)} size="lg" className={"w-full max-w-lg "}>
              {({ close: onClose }) => (
                <>
                  <DialogDismissButton />
                  <Dialog.Header>
                    <Dialog.Heading className="flex items-center gap-2">
                      {t("editTitle", { year: editTarget?.year ?? "" })}
                    </Dialog.Heading>
                  </Dialog.Header>
                  <Dialog.Body>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <TextField
                        value={amount}
                        onChange={setAmount}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("colAmountDue")}</Label>
                        <Input placeholder="0,00" />
                      </TextField>
                      <DateInput label={t("colDueDate")} ariaLabel={String(t("colDueDate"))} value={dueDate} onChange={setDueDate} />
                      <TextField
                        value={note}
                        onChange={setNote}
                        className={["w-full"].filter(Boolean).join(" ")}
                      >
                        <Label>{t("colNote")}</Label>
                        <TextArea
                          maxLength={300}
                          rows={3}
                          className={["[field-sizing:content]"]
                            .filter(Boolean)
                            .join(" ")}
                        />
                      </TextField>
                      <div className="flex items-end pb-2">
                        <Switch
                          isSelected={waived}
                          onChange={setWaived}
                          size={"sm"}
                        >
                            <Label>{t("waived")}</Label>
                        </Switch>
                      </div>
                    </div>
                    {editTarget ? (
                      <p className="text-xs text-ink-400">
                        {t("paidInfo", {
                          paid: formatMoney(editTarget.paidCents),
                        })}
                      </p>
                    ) : null}
                    {formError ? (
                      <p className="text-sm text-danger">{formError}</p>
                    ) : null}
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Button
                      onPress={onClose}
                      variant={actionVariant("default", "light")}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      onPress={submitEdit}
                      variant={actionVariant("primary", "solid")}
                      isPending={saving}
                    >
                      {saving ? <Spinner size="sm" tone="current" /> : null}
                      {t("save")}
                    </Button>
                  </Dialog.Footer>
                </>
              )}
      </Dialog>

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
