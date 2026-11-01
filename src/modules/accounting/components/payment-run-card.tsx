"use client";

import { addToast, Button, Card, CardBody, Checkbox, Input } from "@heroui/react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Row = { id: string; supplierName: string; number: string | null; dueDate: string | null; openCents: number; ibanOk: boolean };
const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

/** ACC-6 ödeme listesi: seçili açık gelen faturalar için SEPA havale dosyası (pain.001). */
export function PaymentRunCard({ rows, defaultDate, horizon }: { rows: Row[]; defaultDate: string; horizon: string }) {
  const t = useTranslations("accounting.paymentRun");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.filter((row) => row.ibanOk && (!row.dueDate || row.dueDate <= horizon)).map((row) => row.id)));
  const [date, setDate] = useState(defaultDate);
  const [busy, setBusy] = useState(false);
  const total = rows.filter((row) => selected.has(row.id)).reduce((sum, row) => sum + row.openCents, 0);
  const toggle = (id: string, on: boolean) => setSelected((current) => {
    const next = new Set(current);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  });

  const download = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/accounting/payment-run?ids=${[...selected].join(",")}&date=${date}`);
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        addToast({ title: result.error ?? t("failed"), color: "danger" });
        return;
      }
      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "pain001.xml";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      addToast({ title: t("done", { count: selected.size }), color: "success" });
    } finally {
      setBusy(false);
    }
  };

  if (!rows.length) return null;
  return (
    <Card shadow="sm">
      <CardBody className="gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-small font-semibold uppercase tracking-wide text-default-500">{t("title")}</h2>
          <p className="text-tiny text-default-500">{t("hint")}</p>
        </div>
        <ul className="flex flex-col divide-y divide-default-100 text-small">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 py-1.5">
              <Checkbox size="sm" isSelected={selected.has(row.id)} isDisabled={!row.ibanOk} onValueChange={(on) => toggle(row.id, on)}>
                <span className="text-small">
                  {row.supplierName} {row.number ? `· ${row.number}` : ""} {row.dueDate ? `· ${t("due", { date: row.dueDate.split("-").reverse().join(".") })}` : ""}
                  {!row.ibanOk ? <span className="ml-2 text-tiny text-danger">{t("noIban")}</span> : null}
                </span>
              </Checkbox>
              <span className="tabular-nums">{euro(row.openCents)}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-3">
          <Input type="date" size="sm" label={t("executionDate")} labelPlacement="outside" value={date} min={defaultDate} onValueChange={setDate} className="max-w-48" />
          <Button color="primary" startContent={<Download className="h-4 w-4" aria-hidden />} isDisabled={!selected.size || !date} isLoading={busy} onPress={download}>
            {t("download", { count: selected.size, total: euro(total) })}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
