"use client";

import { notify } from "@/shared/components/ui/notify";import { Button } from "@heroui/react";
import { Card, Input, Spinner, TextField } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

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
    (cents / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: "EUR",
    });

  const sphereLabel = (sphere: string) => {
    const rawKey = `sphere${sphere}`;
    if (t.has(rawKey)) return t(rawKey);
    const camel = `sphere${sphere.charAt(0)}${sphere.slice(1).toLowerCase()}`;
    if (t.has(camel)) return t(camel);
    return sphere;
  };

  const grouped = useMemo(() => {
    const groups: Array<{
      direction: string;
      sphere: string;
      rows: BudgetLineRow[];
    }> = [];
    for (const line of lines) {
      let group = groups.find(
        (item) =>
          item.direction === line.direction && item.sphere === line.sphere,
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
        notify.error(result.error);
        return;
      }
      notify.success(t("toastSaved"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={"shadow-sm border border-ink-200/80"}>
      <Card.Content className={["gap-4 p-6"].filter(Boolean).join(" ")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {canEdit && !locked ? (
            <Button
              size="sm"
              onPress={copyPrevious}
              variant={actionVariant("default", "flat")}
            >
              {<Copy className="h-4 w-4" aria-hidden />}
              {t("copyFromPrevious")}
            </Button>
          ) : null}
          {locked ? (
            <p className="text-sm text-warning">{t("locked", { year })}</p>
          ) : null}
        </div>

        {grouped.map((group) => (
          <div key={`${group.direction}-${group.sphere}`}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t(`direction${group.direction}`)} — {sphereLabel(group.sphere)}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label={t("colCategory")}>
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="py-2 pr-3">{t("colCategory")}</th>
                    <th className="py-2 pr-3 w-40">{t("colPlan")}</th>
                    <th className="py-2 pr-3 w-32">{t("colActual")}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((line) => (
                    <tr
                      key={line.categoryId}
                      className="border-b border-ink-100 last:border-none"
                    >
                      <td className="py-1.5 pr-3">{line.categoryName}</td>
                      <td className="py-1.5 pr-3">
                        <TextField
                          id={`budget-input-${line.categoryId}`}
                          aria-label={`${line.categoryName} — ${t("colPlan")}`}
                          value={values[line.categoryId] ?? ""}
                          isDisabled={!canEdit || locked}
                          onChange={(value) =>
                            setValues((previous) => ({
                              ...previous,
                              [line.categoryId]: value,
                            }))
                          }
                          className={["w-full"].filter(Boolean).join(" ")}
                        >
                          <Input
                            inputMode="decimal"
                            placeholder="0,00"
                            className={["h-9 text-sm"]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </TextField>
                      </td>
                      <td className="py-1.5 pr-3 text-ink-500">
                        {format(line.actualCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {canEdit && !locked ? (
          <Button
            onPress={save}
            className="self-start"
            variant={actionVariant("primary", "solid")}
            isPending={busy}
          >
            {busy ? <Spinner size="sm" tone="current" /> : null}
            {t("save")}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}
