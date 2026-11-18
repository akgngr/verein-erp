"use client";

import { notify } from "@/shared/components/ui/notify";
import { Input, InputGroup, Label, Select, Spinner, StatusChip, Tabs, TextArea, TextField, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { AlertTriangle, FileDown, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import {
  addPayoutAction,
  deleteGrantAction,
  deletePayoutAction,
  saveLinesAction,
  saveReportAction,
  setPayoutReceivedAction,
} from "../actions/grant-actions";
import type { GrantDetail, GrantReport } from "../services/grants";
import { GrantForm } from "./grant-form";

const toCents = (value: string) =>
  Math.round(Number(value.replace(",", ".") || "0") * 100);

export function GrantDetailApp({
  grant,
  report,
  projects,
  categories,
  can,
  today,
}: {
  grant: GrantDetail;
  report: GrantReport;
  projects: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  can: { update: boolean; delete: boolean };
  today: string;
}) {
  const t = useTranslations("grants");
  const format = useFormatter();
  const translate = useTranslateMessage();
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const money = (cents: number) =>
    format.number(cents / 100, { style: "currency", currency: "EUR" });
  const date = (value: string | null) =>
    value
      ? format.dateTime(new Date(`${value}T12:00:00`), { dateStyle: "medium" })
      : "—";
  const run = (
    call: () => Promise<{ ok: boolean; error?: string }>,
    success?: string,
  ) =>
    start(async () => {
      const response = await call();
      if (!response.ok)
        return void notify.error(translate(response.error));
      if (success) notify.success(success);
      router.refresh();
    });

  const [lines, setLines] = useState(
    grant.lines.map((line) => ({
      label: line.label,
      planned: String(line.plannedCents / 100),
      categoryIds: line.categoryIds,
    })),
  );
  const [payout, setPayout] = useState({
    requestedAt: today,
    amount: "",
    receivedAt: "",
    note: "",
  });
  const [reportText, setReportText] = useState(grant.reportText);

  if (!hydrated) return null;
  return (
    <Tabs emphasis="primary">
        <Tabs.List aria-label={grant.name}>
          <Tabs.Tab id={"general"} key={"general"}>
            {t("tabs.general")}
          </Tabs.Tab>

          <Tabs.Tab id={"plan"} key={"plan"}>
            {t("tabs.plan")}
          </Tabs.Tab>

          <Tabs.Tab id={"payouts"} key={"payouts"}>
            {t("tabs.payouts")}
          </Tabs.Tab>

          <Tabs.Tab id={"report"} key={"report"}>
            {t("tabs.report")}
          </Tabs.Tab>
        </Tabs.List>
      <Tabs.Panel id={"general"} key={"general"}>
        <GrantForm canEdit={can.update} projects={projects} initial={grant} />
        {can.delete ? (
          <Button
            className="mt-6"
            size="sm"
            onPress={() => {
              if (!window.confirm(t("deleteConfirm", { name: grant.name })))
                return;
              start(async () => {
                const response = await deleteGrantAction({ id: grant.id });
                if (response.ok) router.push("/muhasebe/hibeler");
              });
            }}
            variant={actionVariant("danger", "light")}
          >
            {<Trash2 className="size-4" />}
            {t("delete")}
          </Button>
        ) : null}
      </Tabs.Panel>

      <Tabs.Panel id={"plan"} key={"plan"}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-500">{t("planHelp")}</p>
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid grid-cols-1 items-end gap-2 rounded-lg border border-ink-200 p-3 sm:grid-cols-[2fr_1fr_3fr_auto]"
            >
              <TextField
                value={line.label}
                isDisabled={!can.update}
                onChange={(label) =>
                  setLines(
                    lines.map((item, i) =>
                      i === index ? { ...item, label } : item,
                    ),
                  )
                }
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.lineLabel")}</Label>
                <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
              </TextField>
              <TextField
                value={line.planned}
                isDisabled={!can.update}
                onChange={(planned) =>
                  setLines(
                    lines.map((item, i) =>
                      i === index ? { ...item, planned } : item,
                    ),
                  )
                }
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.planned")}</Label>
                <InputGroup>
                  <InputGroup.Input
                    inputMode="decimal"
                    className={["h-9 text-sm"].filter(Boolean).join(" ")}
                  />
                  <InputGroup.Suffix>
                    {<span className="text-xs text-ink-400">€</span>}
                  </InputGroup.Suffix>
                </InputGroup>
              </TextField>
              <Select
                id={`line-categories-${index}`}
                selectionMode="multiple"
                isDisabled={!can.update}
                value={Array.from(line.categoryIds)}
                onChange={(selectedValue) => {
                  const keys = selectedValue.map(String);
                  return setLines(
                    lines.map((item, i) =>
                      i === index ? { ...item, categoryIds: keys } : item,
                    ),
                  );
                }} size="sm">
                <Label>{t("fields.categories")}</Label>
                    {categories.map((category) => (
                      <Select.Item
                        key={category.id}
                        id={category.id}
                        textValue={String(category.name)}
                      >
                        <Label>{category.name}</Label>
                      </Select.Item>
                    ))}
              </Select>
              {can.update ? (
                <Button
                  isIconOnly
                  size="sm"
                  aria-label={t("removeLine")}
                  onPress={() => setLines(lines.filter((_, i) => i !== index))}
                  variant={actionVariant("danger", "light")}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
          {can.update ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onPress={() =>
                  setLines([
                    ...lines,
                    { label: "", planned: "", categoryIds: [] },
                  ])
                }
                variant={actionVariant("default", "flat")}
              >
                {<Plus className="size-4" />}
                {t("addLine")}
              </Button>
              <Button
                size="sm"
                onPress={() =>
                  run(
                    () =>
                      saveLinesAction({
                        grantId: grant.id,
                        lines: lines.map((line) => ({
                          label: line.label,
                          plannedCents: toCents(line.planned),
                          categoryIds: line.categoryIds,
                        })),
                      }),
                    t("saved"),
                  )
                }
                variant={actionVariant("primary", "solid")}
                isPending={pending}
              >
                {pending ? <Spinner size="sm" tone="current" /> : null}
                {t("save")}
              </Button>
            </div>
          ) : null}
          <p className="text-sm font-medium">
            {t("planTotal")}:{" "}
            {money(lines.reduce((sum, line) => sum + toCents(line.planned), 0))}
          </p>
        </div>
      </Tabs.Panel>

      <Tabs.Panel id={"payouts"} key={"payouts"}>
        <div className="flex flex-col gap-3">
          <table className="w-full text-sm">
            <thead className="text-ink-500">
              <tr>
                {(
                  ["requestedAt", "amount", "receivedAt", "note", ""] as const
                ).map((key) => (
                  <th key={key} className="px-2 py-1 text-start font-medium">
                    {key ? t(`fields.${key}`) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grant.payouts.map((item) => (
                <tr key={item.id} className="border-t border-ink-100">
                  <td className="px-2 py-1">{date(item.requestedAt)}</td>
                  <td className="px-2 py-1">{money(item.amountCents)}</td>
                  <td className="px-2 py-1">
                    {item.receivedAt ? (
                      date(item.receivedAt)
                    ) : can.update ? (
                      <Button
                        size="sm"
                        onPress={() =>
                          run(() =>
                            setPayoutReceivedAction({
                              grantId: grant.id,
                              id: item.id,
                              receivedAt: today,
                            }),
                          )
                        }
                        variant={actionVariant("default", "flat")}
                      >
                        {t("markReceived")}
                      </Button>
                    ) : (
                      t("pending")
                    )}
                  </td>
                  <td className="px-2 py-1 text-ink-600">{item.note ?? ""}</td>
                  <td className="px-2 py-1 text-end">
                    {can.update ? (
                      <Button
                        isIconOnly
                        size="sm"
                        aria-label={t("delete")}
                        onPress={() =>
                          run(() =>
                            deletePayoutAction({
                              grantId: grant.id,
                              id: item.id,
                            }),
                          )
                        }
                        variant={actionVariant("danger", "light")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {can.update ? (
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]">
              <TextField
                value={payout.requestedAt}
                onChange={(requestedAt) =>
                  setPayout({ ...payout, requestedAt })
                }
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.requestedAt")}</Label>
                <Input
                  type="date"
                  className={["h-9 text-sm"].filter(Boolean).join(" ")}
                />
              </TextField>
              <TextField
                value={payout.amount}
                onChange={(amount) => setPayout({ ...payout, amount })}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.amount")}</Label>
                <Input
                  inputMode="decimal"
                  className={["h-9 text-sm"].filter(Boolean).join(" ")}
                />
              </TextField>
              <TextField
                value={payout.receivedAt}
                onChange={(receivedAt) => setPayout({ ...payout, receivedAt })}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.receivedAt")}</Label>
                <Input
                  type="date"
                  placeholder=" "
                  className={["h-9 text-sm"].filter(Boolean).join(" ")}
                />
              </TextField>
              <TextField
                value={payout.note}
                onChange={(note) => setPayout({ ...payout, note })}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("fields.note")}</Label>
                <Input className={["h-9 text-sm"].filter(Boolean).join(" ")} />
              </TextField>
              <Button
                size="sm"
                onPress={() =>
                  run(
                    () =>
                      addPayoutAction({
                        grantId: grant.id,
                        requestedAt: payout.requestedAt,
                        amountCents: toCents(payout.amount),
                        receivedAt: payout.receivedAt || null,
                        note: payout.note,
                      }),
                    t("saved"),
                  )
                }
                variant={actionVariant("primary", "solid")}
                isPending={pending}
              >
                {pending ? <Spinner size="sm" tone="current" /> : null}
                {t("add")}
              </Button>
            </div>
          ) : null}
        </div>
      </Tabs.Panel>

      <Tabs.Panel id={"report"} key={"report"}>
        <div className="flex flex-col gap-5">
          {!report.linked ? (
            <p className="rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
              {t("notLinked")}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <ActionLink
              href={`/api/grants/${grant.id}/report-pdf`}
              target="_blank"
              rel="noopener"
              className={buttonClassName({
                variant: actionVariant("primary", "flat"),
              })}
            >
              {<FileDown className="size-4" />}
              {t("reportPdf")}
            </ActionLink>
            {grant.reportSubmittedAt ? (
              <StatusChip tone="success">
                {t("submittedAt", {
                  date: format.dateTime(new Date(grant.reportSubmittedAt), {
                    dateStyle: "medium",
                  }),
                })}
              </StatusChip>
            ) : null}
            {report.missingReceipts ? (
              <StatusChip tone="warning">
                {<AlertTriangle className="size-3.5" />}
                {t("missingReceipts", { count: report.missingReceipts })}
              </StatusChip>
            ) : null}
          </div>
          <section>
            <h3 className="mb-2 font-semibold">{t("report.numbers")}</h3>
            <table className="w-full text-sm">
              <thead className="text-ink-500">
                <tr>
                  {(["line", "planned", "actual", "diff"] as const).map(
                    (key) => (
                      <th
                        key={key}
                        className="px-2 py-1 text-start font-medium"
                      >
                        {t(`report.${key}`)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {report.lines.map((line) => (
                  <tr
                    key={line.id ?? "other"}
                    className="border-t border-ink-100"
                  >
                    <td className="px-2 py-1">{line.label}</td>
                    <td className="px-2 py-1">{money(line.plannedCents)}</td>
                    <td className="px-2 py-1">{money(line.actualCents)}</td>
                    <td
                      className={`px-2 py-1 ${line.flagged ? "font-medium text-warning-600" : ""}`}
                    >
                      {money(line.diffCents)}
                      {line.diffRatio !== null
                        ? ` (${format.number(line.diffRatio, { style: "percent", maximumFractionDigits: 1 })})`
                        : ""}
                      {line.flagged ? " ⚠" : ""}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink-300 font-semibold">
                  <td className="px-2 py-1">{t("report.total")}</td>
                  <td className="px-2 py-1">
                    {money(report.totals.plannedCents)}
                  </td>
                  <td className="px-2 py-1">
                    {money(report.totals.actualCents)}
                  </td>
                  <td className="px-2 py-1">
                    {money(
                      report.totals.actualCents - report.totals.plannedCents,
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-xs text-ink-500">{t("deviationHint")}</p>
          </section>
          <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                "approvedCents",
                "receivedCents",
                "ownShareCents",
                "thirdPartyCents",
                "otherIncomeCents",
                "neededGrantCents",
              ] as const
            ).map((key) => (
              <div key={key} className="rounded-lg border border-ink-200 p-3">
                <p className="text-xs text-ink-500">{t(`financing.${key}`)}</p>
                <p className="font-semibold">{money(report.financing[key])}</p>
              </div>
            ))}
            {report.financing.overpaidCents ? (
              <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 sm:col-span-3">
                <p className="text-sm text-danger">
                  {t("overpaid", {
                    amount: money(report.financing.overpaidCents),
                  })}
                </p>
              </div>
            ) : null}
          </section>
          <section>
            <h3 className="mb-2 font-semibold">
              {t("report.vouchers")} ({report.vouchers.length})
            </h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface text-ink-500">
                  <tr>
                    {(
                      [
                        "date",
                        "number",
                        "lineCol",
                        "description",
                        "amount",
                        "receipt",
                      ] as const
                    ).map((key) => (
                      <th
                        key={key}
                        className="px-2 py-1 text-start font-medium"
                      >
                        {t(`report.${key}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.vouchers.map((row) => (
                    <tr key={row.id} className="border-t border-ink-100">
                      <td className="px-2 py-1">{date(row.date)}</td>
                      <td className="px-2 py-1">{row.bookingNumber}</td>
                      <td className="px-2 py-1">{row.lineLabel}</td>
                      <td className="px-2 py-1">
                        {row.description}
                        {row.counterparty ? ` · ${row.counterparty}` : ""}
                      </td>
                      <td className="px-2 py-1">{money(row.counted)}</td>
                      <td className="px-2 py-1">
                        {row.fileCount ? (
                          "✓"
                        ) : (
                          <span className="text-warning-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t("report.narrative")}</h3>
            <TextField
              aria-label={t("report.narrative")}
              value={reportText}
              isDisabled={!can.update}
              onChange={setReportText}
              className={["w-full"].filter(Boolean).join(" ")}
            >
              <TextArea
                placeholder={t("report.narrativePlaceholder")}
                rows={8}
                className={["[field-sizing:content]"].filter(Boolean).join(" ")}
              />
            </TextField>
            {can.update ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  onPress={() =>
                    run(
                      () =>
                        saveReportAction({
                          id: grant.id,
                          text: reportText,
                          submitted: null,
                        }),
                      t("saved"),
                    )
                  }
                  variant={actionVariant("default", "solid")}
                  isPending={pending}
                >
                  {pending ? <Spinner size="sm" tone="current" /> : null}
                  {t("save")}
                </Button>
                {grant.reportSubmittedAt ? (
                  <Button
                    onPress={() =>
                      run(() =>
                        saveReportAction({
                          id: grant.id,
                          text: reportText,
                          submitted: false,
                        }),
                      )
                    }
                    variant={actionVariant("default", "light")}
                  >
                    {t("unsubmit")}
                  </Button>
                ) : (
                  <Button
                    onPress={() =>
                      run(
                        () =>
                          saveReportAction({
                            id: grant.id,
                            text: reportText,
                            submitted: true,
                          }),
                        t("submittedToast"),
                      )
                    }
                    variant={actionVariant("success", "solid")}
                  >
                    {t("markSubmitted")}
                  </Button>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </Tabs.Panel>
    </Tabs>
  );
}
