"use client";

import { addToast, Button, Chip, Input, Select, SelectItem, Tab, Tabs, Textarea } from "@heroui/react";
import { AlertTriangle, FileDown, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { addPayoutAction, deleteGrantAction, deletePayoutAction, saveLinesAction, saveReportAction, setPayoutReceivedAction } from "../actions/grant-actions";
import type { GrantDetail, GrantReport } from "../services/grants";
import { GrantForm } from "./grant-form";

const toCents = (value: string) => Math.round(Number(value.replace(",", ".") || "0") * 100);

export function GrantDetailApp({ grant, report, projects, categories, can, today }: { grant: GrantDetail; report: GrantReport; projects: { id: string; name: string }[]; categories: { id: string; name: string }[]; can: { update: boolean; delete: boolean }; today: string }) {
  const t = useTranslations("grants");
  const format = useFormatter();
  const translate = useTranslateMessage();
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const money = (cents: number) => format.number(cents / 100, { style: "currency", currency: "EUR" });
  const date = (value: string | null) => (value ? format.dateTime(new Date(`${value}T12:00:00`), { dateStyle: "medium" }) : "—");
  const run = (call: () => Promise<{ ok: boolean; error?: string }>, success?: string) => start(async () => {
    const response = await call();
    if (!response.ok) return void addToast({ title: translate(response.error), color: "danger" });
    if (success) addToast({ title: success, color: "success" });
    router.refresh();
  });

  const [lines, setLines] = useState(grant.lines.map((line) => ({ label: line.label, planned: String(line.plannedCents / 100), categoryIds: line.categoryIds })));
  const [payout, setPayout] = useState({ requestedAt: today, amount: "", receivedAt: "", note: "" });
  const [reportText, setReportText] = useState(grant.reportText);

  if (!hydrated) return null;
  return (
    <Tabs aria-label={grant.name} variant="underlined" destroyInactiveTabPanel={false}>
      <Tab key="general" title={t("tabs.general")}>
        <GrantForm canEdit={can.update} projects={projects} initial={grant} />
        {can.delete ? (
          <Button className="mt-6" size="sm" color="danger" variant="light" startContent={<Trash2 className="size-4" />} onPress={() => {
            if (!window.confirm(t("deleteConfirm", { name: grant.name }))) return;
            start(async () => {
              const response = await deleteGrantAction({ id: grant.id });
              if (response.ok) router.push("/muhasebe/hibeler");
            });
          }}>{t("delete")}</Button>
        ) : null}
      </Tab>

      <Tab key="plan" title={t("tabs.plan")}>
        <div className="flex flex-col gap-3">
          <p className="text-small text-default-500">{t("planHelp")}</p>
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 items-end gap-2 rounded-medium border border-default-200 p-3 sm:grid-cols-[2fr_1fr_3fr_auto]">
              <Input size="sm" label={t("fields.lineLabel")} value={line.label} isDisabled={!can.update} onValueChange={(label) => setLines(lines.map((item, i) => (i === index ? { ...item, label } : item)))} />
              <Input size="sm" label={t("fields.planned")} inputMode="decimal" endContent={<span className="text-tiny text-default-400">€</span>} value={line.planned} isDisabled={!can.update} onValueChange={(planned) => setLines(lines.map((item, i) => (i === index ? { ...item, planned } : item)))} />
              <Select id={`line-categories-${index}`} size="sm" label={t("fields.categories")} selectionMode="multiple" selectedKeys={line.categoryIds} isDisabled={!can.update} onSelectionChange={(keys) => setLines(lines.map((item, i) => (i === index ? { ...item, categoryIds: keys === "all" ? categories.map((c) => c.id) : Array.from(keys).map(String) } : item)))}>
                {categories.map((category) => <SelectItem key={category.id}>{category.name}</SelectItem>)}
              </Select>
              {can.update ? <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("removeLine")} onPress={() => setLines(lines.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button> : null}
            </div>
          ))}
          {can.update ? (
            <div className="flex gap-2">
              <Button size="sm" variant="flat" startContent={<Plus className="size-4" />} onPress={() => setLines([...lines, { label: "", planned: "", categoryIds: [] }])}>{t("addLine")}</Button>
              <Button size="sm" color="primary" isLoading={pending} onPress={() => run(() => saveLinesAction({ grantId: grant.id, lines: lines.map((line) => ({ label: line.label, plannedCents: toCents(line.planned), categoryIds: line.categoryIds })) }), t("saved"))}>{t("save")}</Button>
            </div>
          ) : null}
          <p className="text-small font-medium">{t("planTotal")}: {money(lines.reduce((sum, line) => sum + toCents(line.planned), 0))}</p>
        </div>
      </Tab>

      <Tab key="payouts" title={t("tabs.payouts")}>
        <div className="flex flex-col gap-3">
          <table className="w-full text-small">
            <thead className="text-default-500"><tr>{(["requestedAt", "amount", "receivedAt", "note", ""] as const).map((key) => <th key={key} className="px-2 py-1 text-start font-medium">{key ? t(`fields.${key}`) : ""}</th>)}</tr></thead>
            <tbody>
              {grant.payouts.map((item) => (
                <tr key={item.id} className="border-t border-default-100">
                  <td className="px-2 py-1">{date(item.requestedAt)}</td>
                  <td className="px-2 py-1">{money(item.amountCents)}</td>
                  <td className="px-2 py-1">{item.receivedAt ? date(item.receivedAt) : can.update ? <Button size="sm" variant="flat" onPress={() => run(() => setPayoutReceivedAction({ grantId: grant.id, id: item.id, receivedAt: today }))}>{t("markReceived")}</Button> : t("pending")}</td>
                  <td className="px-2 py-1 text-default-600">{item.note ?? ""}</td>
                  <td className="px-2 py-1 text-end">{can.update ? <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("delete")} onPress={() => run(() => deletePayoutAction({ grantId: grant.id, id: item.id }))}><Trash2 className="size-4" /></Button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {can.update ? (
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]">
              <Input size="sm" type="date" label={t("fields.requestedAt")} value={payout.requestedAt} onValueChange={(requestedAt) => setPayout({ ...payout, requestedAt })} />
              <Input size="sm" label={t("fields.amount")} inputMode="decimal" value={payout.amount} onValueChange={(amount) => setPayout({ ...payout, amount })} />
              <Input size="sm" type="date" label={t("fields.receivedAt")} placeholder=" " value={payout.receivedAt} onValueChange={(receivedAt) => setPayout({ ...payout, receivedAt })} />
              <Input size="sm" label={t("fields.note")} value={payout.note} onValueChange={(note) => setPayout({ ...payout, note })} />
              <Button size="sm" color="primary" isLoading={pending} onPress={() => run(() => addPayoutAction({ grantId: grant.id, requestedAt: payout.requestedAt, amountCents: toCents(payout.amount), receivedAt: payout.receivedAt || null, note: payout.note }), t("saved"))}>{t("add")}</Button>
            </div>
          ) : null}
        </div>
      </Tab>

      <Tab key="report" title={t("tabs.report")}>
        <div className="flex flex-col gap-5">
          {!report.linked ? <p className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">{t("notLinked")}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button as="a" href={`/api/grants/${grant.id}/report-pdf`} target="_blank" rel="noopener" color="primary" variant="flat" startContent={<FileDown className="size-4" />}>{t("reportPdf")}</Button>
            {grant.reportSubmittedAt ? <Chip color="success" variant="flat">{t("submittedAt", { date: format.dateTime(new Date(grant.reportSubmittedAt), { dateStyle: "medium" }) })}</Chip> : null}
            {report.missingReceipts ? <Chip color="warning" variant="flat" startContent={<AlertTriangle className="size-3.5" />}>{t("missingReceipts", { count: report.missingReceipts })}</Chip> : null}
          </div>
          <section>
            <h3 className="mb-2 font-semibold">{t("report.numbers")}</h3>
            <table className="w-full text-small">
              <thead className="text-default-500"><tr>{(["line", "planned", "actual", "diff"] as const).map((key) => <th key={key} className="px-2 py-1 text-start font-medium">{t(`report.${key}`)}</th>)}</tr></thead>
              <tbody>
                {report.lines.map((line) => (
                  <tr key={line.id ?? "other"} className="border-t border-default-100">
                    <td className="px-2 py-1">{line.label}</td>
                    <td className="px-2 py-1">{money(line.plannedCents)}</td>
                    <td className="px-2 py-1">{money(line.actualCents)}</td>
                    <td className={`px-2 py-1 ${line.flagged ? "font-medium text-warning-600" : ""}`}>{money(line.diffCents)}{line.diffRatio !== null ? ` (${format.number(line.diffRatio, { style: "percent", maximumFractionDigits: 1 })})` : ""}{line.flagged ? " ⚠" : ""}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-default-300 font-semibold"><td className="px-2 py-1">{t("report.total")}</td><td className="px-2 py-1">{money(report.totals.plannedCents)}</td><td className="px-2 py-1">{money(report.totals.actualCents)}</td><td className="px-2 py-1">{money(report.totals.actualCents - report.totals.plannedCents)}</td></tr>
              </tbody>
            </table>
            <p className="mt-1 text-tiny text-default-500">{t("deviationHint")}</p>
          </section>
          <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["approvedCents", "receivedCents", "ownShareCents", "thirdPartyCents", "otherIncomeCents", "neededGrantCents"] as const).map((key) => (
              <div key={key} className="rounded-medium border border-default-200 p-3"><p className="text-tiny text-default-500">{t(`financing.${key}`)}</p><p className="font-semibold">{money(report.financing[key])}</p></div>
            ))}
            {report.financing.overpaidCents ? <div className="rounded-medium border border-danger-200 bg-danger-50 p-3 sm:col-span-3"><p className="text-small text-danger">{t("overpaid", { amount: money(report.financing.overpaidCents) })}</p></div> : null}
          </section>
          <section>
            <h3 className="mb-2 font-semibold">{t("report.vouchers")} ({report.vouchers.length})</h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-tiny">
                <thead className="sticky top-0 bg-content1 text-default-500"><tr>{(["date", "number", "lineCol", "description", "amount", "receipt"] as const).map((key) => <th key={key} className="px-2 py-1 text-start font-medium">{t(`report.${key}`)}</th>)}</tr></thead>
                <tbody>
                  {report.vouchers.map((row) => (
                    <tr key={row.id} className="border-t border-default-100">
                      <td className="px-2 py-1">{date(row.date)}</td><td className="px-2 py-1">{row.bookingNumber}</td><td className="px-2 py-1">{row.lineLabel}</td>
                      <td className="px-2 py-1">{row.description}{row.counterparty ? ` · ${row.counterparty}` : ""}</td><td className="px-2 py-1">{money(row.counted)}</td>
                      <td className="px-2 py-1">{row.fileCount ? "✓" : <span className="text-warning-600">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t("report.narrative")}</h3>
            <Textarea aria-label={t("report.narrative")} placeholder={t("report.narrativePlaceholder")} minRows={8} value={reportText} isDisabled={!can.update} onValueChange={setReportText} />
            {can.update ? (
              <div className="flex flex-wrap gap-2">
                <Button isLoading={pending} onPress={() => run(() => saveReportAction({ id: grant.id, text: reportText, submitted: null }), t("saved"))}>{t("save")}</Button>
                {grant.reportSubmittedAt
                  ? <Button variant="light" onPress={() => run(() => saveReportAction({ id: grant.id, text: reportText, submitted: false }))}>{t("unsubmit")}</Button>
                  : <Button color="success" onPress={() => run(() => saveReportAction({ id: grant.id, text: reportText, submitted: true }), t("submittedToast"))}>{t("markSubmitted")}</Button>}
              </div>
            ) : null}
          </section>
        </div>
      </Tab>
    </Tabs>
  );
}
