"use client";

import { notify } from "@/shared/components/ui/notify";
import { Card, Checkbox, Input, Label, Spinner, TextField, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Row = {
  id: string;
  supplierName: string;
  number: string | null;
  dueDate: string | null;
  openCents: number;
  ibanOk: boolean;
};
const euro = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/** ACC-6 ödeme listesi: seçili açık gelen faturalar için SEPA havale dosyası (pain.001). */
export function PaymentRunCard({
  rows,
  defaultDate,
  horizon,
}: {
  rows: Row[];
  defaultDate: string;
  horizon: string;
}) {
  const t = useTranslations("accounting.paymentRun");
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        rows
          .filter(
            (row) => row.ibanOk && (!row.dueDate || row.dueDate <= horizon),
          )
          .map((row) => row.id),
      ),
  );
  const [date, setDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const total = rows
    .filter((row) => selected.has(row.id))
    .reduce((sum, row) => sum + row.openCents, 0);
  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const download = async () => {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/accounting/payment-run?ids=${[...selected].join(",")}&date=${date}`,
      );
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        notify.error(result.error ?? t("failed"));
        return;
      }
      const name =
        /filename="([^"]+)"/.exec(
          response.headers.get("Content-Disposition") ?? "",
        )?.[1] ?? "pain001.xml";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      notify.success(t("done", { count: selected.size }));
    } finally {
      setBusy(false);
    }
  };

  if (!rows.length) return null;
  return (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Content className={["gap-3 p-5"].filter(Boolean).join(" ")}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            {t("title")}
          </h2>
          <p className="text-xs text-ink-500">{t("hint")}</p>
        </div>
        <ul className="flex flex-col divide-y divide-ink-100 text-sm">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-2 py-1.5"
            >
              <Checkbox
                isSelected={selected.has(row.id)}
                isDisabled={!row.ibanOk}
                onChange={(on) => toggle(row.id, on)}
              >
                  <Label>
                    <span className="text-sm">
                      {row.supplierName} {row.number ? `· ${row.number}` : ""}{" "}
                      {row.dueDate
                        ? `· ${t("due", { date: row.dueDate.split("-").reverse().join(".") })}`
                        : ""}
                      {!row.ibanOk ? (
                        <span className="ml-2 text-xs text-danger">
                          {t("noIban")}
                        </span>
                      ) : null}
                    </span>
                  </Label>
              </Checkbox>
              <span className="tabular-nums">{euro(row.openCents)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-3">
          <TextField
            value={date}
            onChange={setDate}
            className={["max-w-48"].filter(Boolean).join(" ")}
          >
            <Label>{t("executionDate")}</Label>
            <Input
              type="date"
              min={defaultDate}
              className={["h-9 text-sm"].filter(Boolean).join(" ")}
            />
          </TextField>
          <Button
            isDisabled={!selected.size || !date}
            onPress={download}
            variant={actionVariant("primary", "solid")}
            isPending={busy}
          >
            {busy ? <Spinner size="sm" tone="current" /> : null}
            {<Download className="h-4 w-4" aria-hidden />}
            {t("download", { count: selected.size, total: euro(total) })}
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
}
