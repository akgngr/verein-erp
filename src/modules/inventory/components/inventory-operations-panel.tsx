"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Button,
  Card,
  Checkbox,
  DateInput,
  Input,
  Label,
  Select,
  StatusChip,
  TextField,
} from "@/shared/components/kit";
import { actionVariant } from "@/shared/components/ui/action-appearance";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import {
  lendInventoryItemAction,
  recordMaintenanceAction,
  returnInventoryItemAction,
} from "../actions/lending-maintenance-actions";
import type { InventoryOperationsData } from "../queries/lending-maintenance";

const MAINTENANCE_KINDS = ["DGUV_V3", "TUV", "SERVICE", "OTHER"] as const;

export function InventoryOperationsPanel({
  data,
  canUpdate,
  today,
}: {
  data: InventoryOperationsData;
  canUpdate: boolean;
  today: string;
}) {
  const t = useTranslations("inventory.operations");
  const format = useFormatter();
  const translate = useTranslateMessage();
  const router = useRouter();
  const [pending, start] = useTransition();

  const [loanForm, setLoanForm] = useState({
    itemId: data.items[0]?.id ?? "",
    borrowerName: "",
    lentAt: today,
    dueAt: "",
    note: "",
  });

  const [maintForm, setMaintForm] = useState({
    itemId: data.items[0]?.id ?? "",
    kind: "DGUV_V3" as (typeof MAINTENANCE_KINDS)[number],
    performedAt: today,
    nextDueAt: "",
    inspector: "",
    passed: true,
    note: "",
  });

  const fmtDate = (iso: string | null) =>
    iso ? format.dateTime(new Date(`${iso}T12:00:00`), { dateStyle: "medium" }) : "—";

  const runAction = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg: string,
    onDone?: () => void,
  ) => {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        notify.error(translate(res.error));
        return;
      }
      notify.success(successMsg);
      onDone?.();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold">{t("inspectionsTitle")}</h2>
          <p className="text-xs text-ink-500">{t("inspectionsDescription")}</p>
        </div>
        {data.inspections.length === 0 ? (
          <p className="text-sm text-ink-500">{t("noInspections")}</p>
        ) : (
          <div className="divide-y divide-ink-200">
            {data.inspections.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{row.name}</span>
                  {row.serialNumber ? (
                    <span className="ml-2 text-xs text-ink-500">({row.serialNumber})</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-500">{fmtDate(row.nextInspectionAt)}</span>
                  <StatusChip
                    tone={
                      row.inspectionStatus === "overdue"
                        ? "danger"
                        : row.inspectionStatus === "due_soon"
                          ? "warning"
                          : "success"
                    }
                  >
                    {t(`inspectionStatuses.${row.inspectionStatus}`)}
                  </StatusChip>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">{t("lendingTitle")}</h2>
          {canUpdate && data.items.length > 0 ? (
            <div className="mb-4 flex flex-col gap-3 border-b border-ink-200 pb-4">
              <Select
                id="lend-item"
                value={loanForm.itemId}
                onChange={(v) => setLoanForm((f) => ({ ...f, itemId: String(v ?? f.itemId) }))}
              >
                <Label>{t("item")}</Label>
                {data.items.map((item) => (
                  <Select.Item key={item.id} id={item.id} textValue={item.name}>
                    <Label>{item.name}</Label>
                  </Select.Item>
                ))}
              </Select>
              <TextField
                value={loanForm.borrowerName}
                onChange={(v) => setLoanForm((f) => ({ ...f, borrowerName: v }))}
              >
                <Label>{t("borrower")}</Label>
                <Input placeholder=" " />
              </TextField>
              <div className="grid grid-cols-2 gap-3">
                <DateInput
                  label={t("lentAt")}
                  ariaLabel={t("lentAt")}
                  value={loanForm.lentAt}
                  onChange={(v) => setLoanForm((f) => ({ ...f, lentAt: v }))}
                />
                <DateInput
                  label={t("dueAt")}
                  ariaLabel={t("dueAt")}
                  value={loanForm.dueAt}
                  onChange={(v) => setLoanForm((f) => ({ ...f, dueAt: v }))}
                />
              </div>
              <Button
                size="sm"
                variant={actionVariant("primary", "solid")}
                isPending={pending}
                isDisabled={!loanForm.itemId || loanForm.borrowerName.trim().length < 2}
                onPress={() =>
                  runAction(
                    () =>
                      lendInventoryItemAction({
                        itemId: loanForm.itemId,
                        borrowerName: loanForm.borrowerName,
                        lentAt: loanForm.lentAt,
                        dueAt: loanForm.dueAt || null,
                        note: loanForm.note || null,
                      }),
                    t("lentToast"),
                    () => setLoanForm((f) => ({ ...f, borrowerName: "", dueAt: "", note: "" })),
                  )
                }
              >
                {t("lendSubmit")}
              </Button>
            </div>
          ) : null}

          {data.loans.length === 0 ? (
            <p className="text-sm text-ink-500">{t("noLoans")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-ink-200">
              {data.loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {loan.itemName} — {loan.borrowerName}
                    </div>
                    <div className="text-xs text-ink-500">
                      {fmtDate(loan.lentAt)}
                      {loan.dueAt ? ` → ${fmtDate(loan.dueAt)}` : ""}
                    </div>
                  </div>
                  {loan.returnedAt ? (
                    <StatusChip tone="success">
                      {t("returnedOn", { date: fmtDate(loan.returnedAt) })}
                    </StatusChip>
                  ) : canUpdate ? (
                    <Button
                      size="sm"
                      variant={actionVariant("default", "bordered")}
                      isPending={pending}
                      onPress={() =>
                        runAction(
                          () => returnInventoryItemAction({ loanId: loan.id, returnedAt: today }),
                          t("returnedToast"),
                        )
                      }
                    >
                      {t("markReturned")}
                    </Button>
                  ) : (
                    <StatusChip tone="warning">{t("openLoan")}</StatusChip>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">{t("maintenanceTitle")}</h2>
          {canUpdate && data.items.length > 0 ? (
            <div className="mb-4 flex flex-col gap-3 border-b border-ink-200 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  id="maint-item"
                  value={maintForm.itemId}
                  onChange={(v) => setMaintForm((f) => ({ ...f, itemId: String(v ?? f.itemId) }))}
                >
                  <Label>{t("item")}</Label>
                  {data.items.map((item) => (
                    <Select.Item key={item.id} id={item.id} textValue={item.name}>
                      <Label>{item.name}</Label>
                    </Select.Item>
                  ))}
                </Select>
                <Select
                  id="maint-kind"
                  value={maintForm.kind}
                  onChange={(v) =>
                    setMaintForm((f) => ({
                      ...f,
                      kind: String(v ?? f.kind) as (typeof MAINTENANCE_KINDS)[number],
                    }))
                  }
                >
                  <Label>{t("kind")}</Label>
                  {MAINTENANCE_KINDS.map((k) => (
                    <Select.Item key={k} id={k} textValue={String(t(`kinds.${k}`))}>
                      <Label>{t(`kinds.${k}`)}</Label>
                    </Select.Item>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateInput
                  label={t("performedAt")}
                  ariaLabel={t("performedAt")}
                  value={maintForm.performedAt}
                  onChange={(v) => setMaintForm((f) => ({ ...f, performedAt: v }))}
                />
                <DateInput
                  label={t("nextDueAt")}
                  ariaLabel={t("nextDueAt")}
                  value={maintForm.nextDueAt}
                  onChange={(v) => setMaintForm((f) => ({ ...f, nextDueAt: v }))}
                />
              </div>
              <TextField
                value={maintForm.inspector}
                onChange={(v) => setMaintForm((f) => ({ ...f, inspector: v }))}
              >
                <Label>{t("inspector")}</Label>
                <Input placeholder=" " />
              </TextField>
              <Checkbox
                isSelected={maintForm.passed}
                onChange={(v) => setMaintForm((f) => ({ ...f, passed: v }))}
              >
                <Label>
                  <span className="text-sm">{t("passed")}</span>
                </Label>
              </Checkbox>
              <Button
                size="sm"
                variant={actionVariant("primary", "solid")}
                isPending={pending}
                isDisabled={!maintForm.itemId}
                onPress={() =>
                  runAction(
                    () =>
                      recordMaintenanceAction({
                        itemId: maintForm.itemId,
                        kind: maintForm.kind,
                        performedAt: maintForm.performedAt,
                        nextDueAt: maintForm.nextDueAt || null,
                        inspector: maintForm.inspector || null,
                        passed: maintForm.passed,
                        note: maintForm.note || null,
                      }),
                    t("maintenanceToast"),
                    () =>
                      setMaintForm((f) => ({ ...f, nextDueAt: "", inspector: "", note: "" })),
                  )
                }
              >
                {t("maintenanceSubmit")}
              </Button>
            </div>
          ) : null}

          {data.maintenances.length === 0 ? (
            <p className="text-sm text-ink-500">{t("noMaintenances")}</p>
          ) : (
            <div className="flex flex-col divide-y divide-ink-200">
              {data.maintenances.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {m.itemName} · {t(`kinds.${m.kind}`)}
                    </div>
                    <div className="text-xs text-ink-500">
                      {fmtDate(m.performedAt)}
                      {m.inspector ? ` · ${m.inspector}` : ""}
                      {m.nextDueAt ? ` · ${t("nextShort")}: ${fmtDate(m.nextDueAt)}` : ""}
                    </div>
                  </div>
                  <StatusChip tone={m.passed ? "success" : "danger"}>
                    {m.passed ? t("passedBadge") : t("failedBadge")}
                  </StatusChip>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
