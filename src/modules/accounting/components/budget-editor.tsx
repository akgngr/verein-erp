"use client";

import { Button, Card, CardBody, Input, addToast } from "@heroui/react";
import { Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { BudgetLineRow } from "../types";
import { saveBudgetAction } from "../actions/budget-actions";

/**
 * Bütçe düzenleme tablosu (§ 11.5): yön+alan gruplu, satır başına plan girişi,
 * gerçekleşen yanında; "önceki yıldan kopyala" boş satırları doldurur;
 * kaydetme değişen tüm satırları tek aksiyonda yazar.
 */
export function BudgetEditor({
  year,
  lines,
  canEdit,
  locked,
  previousYearLines,
}: {
  year: number;
  lines: BudgetLineRow[];
  canEdit: boolean;
  locked: boolean;
  previousYearLines: BudgetLineRow[];
}) {
  const t = useTranslations("accounting.budget");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      lines.map((line) => [
        line.categoryId,
        line.planCents !== null && line.planCents !== 0
          ? (line.planCents / 100).toFixed(2)
          : "",
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);

  const format = (cents: number) =>
    (cents / 100).toLocaleString("tr-TR", { style: "currency", currency: "EUR" });

  const sphereLabel = (sphere: string) =>
    t(`sphere${sphere.charAt(0)}${sphere.slice(1).toLowerCase()}`);

  const grouped = useMemo(() => {
    const groups: Array<{ direction: string; sphere: string; rows: BudgetLineRow[] }> = [];
    for (const line of lines) {
      let group = groups.find(
        (item) => item.direction === line.direction && item.sphere === line.sphere,
      );
      if (!group) {
        group = { direction: line.direction, sphere: line.sphere, rows: [] };
        groups.push(group);
      }
      group.rows.push(line);
    }
    return groups;
  }, [lines]);

  const copyPrevious = () => {
    const next = { ...values };
    for (const line of previousYearLines) {
      if (!next[line.categoryId] && line.planCents) {
        next[line.categoryId] = (line.planCents / 100).toFixed(2);
      }
    }
    setValues(next);
  };

  const save = async () => {
    setBusy(true);
    try {
      const result = await saveBudgetAction({
        year,
        lines: lines.map((line) => ({
          categoryId: line.categoryId,
          amount: values[line.categoryId] ?? "",
        })),
      });
      if (!result.ok) {
        addToast({ title: result.error, color: "danger" });
        return;
      }
      addToast({ title: t("toastSaved"), color: "success" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card shadow="sm">
      <CardBody className="gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {canEdit && !locked ? (
            <Button
              size="sm"
              variant="flat"
              startContent={<Copy className="h-4 w-4" aria-hidden />}
              onPress={copyPrevious}
            >
              {t("copyFromPrevious")}
            </Button>
          ) : null}
          {locked ? (
            <p className="text-small text-warning">{t("locked", { year })}</p>
          ) : null}
        </div>

        {grouped.map((group) => (
          <div key={`${group.direction}-${group.sphere}`}>
            <h3 className="mb-1 text-tiny font-semibold uppercase tracking-wide text-default-400">
              {t(`direction${group.direction}`)} — {sphereLabel(group.sphere)}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-small" aria-label={t("colCategory")}>
                <thead>
                  <tr className="border-b border-default-200 text-left text-tiny uppercase tracking-wide text-default-400">
                    <th className="py-2 pr-3">{t("colCategory")}</th>
                    <th className="py-2 pr-3 w-40">{t("colPlan")}</th>
                    <th className="py-2 pr-3 w-32">{t("colActual")}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((line) => (
                    <tr key={line.categoryId} className="border-b border-default-100 last:border-none">
                      <td className="py-1.5 pr-3">{line.categoryName}</td>
                      <td className="py-1.5 pr-3">
                        <Input
                          aria-label={`${line.categoryName} — ${t("colPlan")}`}
                          value={values[line.categoryId] ?? ""}
                          onValueChange={(value) =>
                            setValues((previous) => ({ ...previous, [line.categoryId]: value }))
                          }
                          isDisabled={!canEdit || locked}
                          inputMode="decimal"
                          size="sm"
                          placeholder="0,00"
                        />
                      </td>
                      <td className="py-1.5 pr-3 text-default-500">{format(line.actualCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {canEdit && !locked ? (
          <Button color="primary" onPress={save} isLoading={busy} className="self-start">
            {t("save")}
          </Button>
        ) : null}
      </CardBody>
    </Card>
  );
}
