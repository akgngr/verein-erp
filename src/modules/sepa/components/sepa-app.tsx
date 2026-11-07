"use client";

import { addToast, Button, Chip, Input, Select, SelectItem } from "@heroui/react";
import { Download, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { cancelRunAction, createRunAction, markCollectedAction, markReturnedAction, previewRunAction } from "../actions/sepa-actions";

type Preview = Extract<Awaited<ReturnType<typeof previewRunAction>>, { ok: true }>["data"];
type RunRow = { id: string; number: string; source: "MEMBER_DUES" | "COURSE_FEES"; sourceParam: string; collectionDate: string; status: "CREATED" | "COLLECTED" | "CANCELLED"; totalCents: number; itemCount: number; returned: number; createdAt: string; createdByLabel: string };
const STATUS_COLOR = { CREATED: "primary", COLLECTED: "success", CANCELLED: "default", PENDING: "default", RETURNED: "danger" } as const;

function useMoney() {
  const format = useFormatter();
  return { money: (cents: number) => format.number(cents / 100, { style: "currency", currency: "EUR" }), date: (value: string) => format.dateTime(new Date(`${value}T12:00:00`), { dateStyle: "medium" }) };
}

/** /sepa: yeni tahsilat (önizlemeli) ve geçmiş çalıştırmalar. */
export function SepaApp({ runs, defaults, sources, problems, canCreate }: { runs: RunRow[]; defaults: { year: string; until: string; collectionDate: string }; sources: ("MEMBER_DUES" | "COURSE_FEES")[]; problems: string[]; canCreate: boolean }) {
  const t = useTranslations("sepa");
  const translate = useTranslateMessage();
  const router = useRouter();
  const hydrated = useHydrated();
  const { money, date } = useMoney();
  const [source, setSource] = useState(sources[0] ?? "MEMBER_DUES");
  const [param, setParam] = useState({ MEMBER_DUES: defaults.year, COURSE_FEES: defaults.until });
  const [collectionDate, setCollectionDate] = useState(defaults.collectionDate);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, start] = useTransition();

  if (!hydrated) return null;
  return (
    <div className="flex flex-col gap-6">
      {problems.length ? <div className="rounded-medium bg-warning-50 p-3 text-small text-warning-700">{problems.map((key) => t(`errors.${key}` as never)).join(" ")} <Link className="underline" href="/muhasebe/faturalar?yeni=ayarlar">{t("openSettings")}</Link></div> : null}
      {canCreate && sources.length ? (
        <section className="flex flex-col gap-4 rounded-large border border-default-200 p-4">
          <h2 className="font-semibold">{t("newRun")}</h2>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
            <Select id="sepa-source" label={t("source")} labelPlacement="outside" selectedKeys={[source]} onSelectionChange={(keys) => { setSource(String(Array.from(keys)[0] ?? source) as typeof source); setPreview(null); }}>
              {sources.map((key) => <SelectItem key={key}>{t(`sources.${key}`)}</SelectItem>)}
            </Select>
            {source === "MEMBER_DUES"
              ? <Input label={t("year")} labelPlacement="outside" placeholder=" " inputMode="numeric" value={param.MEMBER_DUES} onValueChange={(value) => { setParam({ ...param, MEMBER_DUES: value }); setPreview(null); }} />
              : <Input type="date" label={t("dueUntil")} labelPlacement="outside" placeholder=" " value={param.COURSE_FEES} onValueChange={(value) => { setParam({ ...param, COURSE_FEES: value }); setPreview(null); }} />}
            <Input type="date" label={t("collectionDate")} labelPlacement="outside" placeholder=" " description={t("collectionHelp")} value={collectionDate} onValueChange={setCollectionDate} />
            <Button startContent={<Search className="size-4" />} isLoading={pending} onPress={() => start(async () => {
              const response = await previewRunAction({ source, param: param[source] });
              if (!response.ok) return void addToast({ title: translate(response.error), color: "danger" });
              setPreview(response.data);
            })}>{t("preview")}</Button>
          </div>
          {preview ? (
            <div className="flex flex-col gap-3">
              <p className="text-small">{t("previewSummary", { count: preview.ready.length, total: money(preview.totalCents), skipped: preview.skipped.length })}</p>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-small">
                  <thead className="sticky top-0 bg-content1 text-default-500"><tr>{(["debtor", "iban", "mandate", "amount"] as const).map((key) => <th key={key} className="px-2 py-1 text-start font-medium">{t(`columns.${key}`)}</th>)}</tr></thead>
                  <tbody>
                    {preview.ready.map((item) => (
                      <tr key={item.sourceKey} className="border-t border-default-100"><td className="px-2 py-1">{item.label}</td><td className="px-2 py-1 font-mono text-tiny">{item.ibanMasked}</td><td className="px-2 py-1 font-mono text-tiny">{item.mandateReference}</td><td className="px-2 py-1">{money(item.amountCents)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.skipped.length ? (
                <details className="text-small"><summary className="cursor-pointer text-warning-600">{t("skippedTitle", { count: preview.skipped.length })}</summary>
                  <ul className="mt-2 list-disc ps-5 text-default-600">{preview.skipped.map((item, index) => <li key={index}>{item.label} · {money(item.amountCents)} · {t(`skip.${item.reason}`)}</li>)}</ul>
                </details>
              ) : null}
              <Button color="primary" className="self-start" isDisabled={!preview.ready.length || preview.problems.length > 0} isLoading={pending} onPress={() => start(async () => {
                const response = await createRunAction({ source, param: param[source], collectionDate, sourceKeys: null });
                if (!response.ok) return void addToast({ title: translate(response.error), color: "danger" });
                addToast({ title: t("created", { number: response.data.number }), color: "success" });
                router.push(`/muhasebe/sepa/${response.data.id}`);
              })}>{t("createRun")}</Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("history")}</h2>
        {runs.length === 0 ? <p className="text-small text-default-500">{t("empty")}</p> : (
          <table className="w-full text-small">
            <thead className="text-default-500"><tr>{(["number", "source", "collectionDate", "items", "total", "status"] as const).map((key) => <th key={key} className="px-2 py-1 text-start font-medium">{t(`columns.${key}`)}</th>)}</tr></thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-default-100">
                  <td className="px-2 py-1"><Link className="font-mono text-primary hover:underline" href={`/muhasebe/sepa/${run.id}`}>{run.number}</Link></td>
                  <td className="px-2 py-1">{t(`sources.${run.source}`)} · {run.sourceParam}</td>
                  <td className="px-2 py-1">{date(run.collectionDate)}</td>
                  <td className="px-2 py-1">{run.itemCount}{run.returned ? <span className="text-danger"> ({t("returnedCount", { count: run.returned })})</span> : null}</td>
                  <td className="px-2 py-1">{money(run.totalCents)}</td>
                  <td className="px-2 py-1"><Chip size="sm" variant="flat" color={STATUS_COLOR[run.status]}>{t(`status.${run.status}`)}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

type RunDetail = { id: string; number: string; status: "CREATED" | "COLLECTED" | "CANCELLED"; collectionDate: string; collectedAt: string | null; totalCents: number; items: { id: string; debtorName: string; ibanMasked: string; mandateReference: string; amountCents: number; endToEndId: string; status: "PENDING" | "COLLECTED" | "RETURNED"; receipt: string | null; returnReason: string | null }[] };

/** /sepa/<id>: XML indirme, tahsil edildi işaretleme, geri dönen kalemler. */
export function SepaRunDetail({ run, can }: { run: RunDetail; can: { download: boolean; update: boolean; cancel: boolean } }) {
  const t = useTranslations("sepa");
  const translate = useTranslateMessage();
  const router = useRouter();
  const { money, date } = useMoney();
  const [collectedAt, setCollectedAt] = useState(run.collectionDate);
  const [pending, start] = useTransition();
  const call = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => start(async () => {
    const response = await fn();
    if (!response.ok) return void addToast({ title: translate(response.error), color: "danger" });
    if (done) addToast({ title: done, color: "success" });
    router.refresh();
  });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <Chip variant="flat" color={STATUS_COLOR[run.status]}>{t(`status.${run.status}`)}</Chip>
        <span className="text-small text-default-600">{t("collectionDate")}: {date(run.collectionDate)} · {money(run.totalCents)}</span>
        {can.download && run.status !== "CANCELLED" ? <Button as="a" href={`/api/sepa/${run.id}/xml`} color="primary" variant="flat" startContent={<Download className="size-4" />}>{t("downloadXml")}</Button> : null}
      </div>
      {run.status === "CREATED" ? <p className="text-small text-default-500">{t("uploadHint")}</p> : null}
      {run.status === "CREATED" && can.update ? (
        <div className="flex flex-wrap items-end gap-2">
          <Input className="max-w-[200px]" type="date" label={t("collectedAt")} labelPlacement="outside" placeholder=" " value={collectedAt} onValueChange={setCollectedAt} />
          <Button color="success" isLoading={pending} onPress={() => window.confirm(t("collectConfirm", { count: run.items.length })) && call(() => markCollectedAction({ id: run.id, collectedAt }), t("collectedToast"))}>{t("markCollected")}</Button>
          {can.cancel ? <Button variant="light" color="danger" isDisabled={pending} onPress={() => window.confirm(t("cancelConfirm")) && call(() => cancelRunAction({ id: run.id }))}>{t("cancelRun")}</Button> : null}
        </div>
      ) : null}
      <table className="w-full text-small">
        <thead className="text-default-500"><tr>{(["debtor", "iban", "mandate", "amount", "status", "receipt", ""] as const).map((key) => <th key={key} className="px-2 py-1 text-start font-medium">{key ? t(`columns.${key}`) : ""}</th>)}</tr></thead>
        <tbody>
          {run.items.map((item) => (
            <tr key={item.id} className="border-t border-default-100">
              <td className="px-2 py-1">{item.debtorName}<span className="block font-mono text-tiny text-default-400">{item.endToEndId}</span></td>
              <td className="px-2 py-1 font-mono text-tiny">{item.ibanMasked}</td>
              <td className="px-2 py-1 font-mono text-tiny">{item.mandateReference}</td>
              <td className="px-2 py-1">{money(item.amountCents)}</td>
              <td className="px-2 py-1"><Chip size="sm" variant="flat" color={STATUS_COLOR[item.status]}>{t(`itemStatus.${item.status}`)}</Chip>{item.returnReason ? <span className="block text-tiny text-danger">{item.returnReason}</span> : null}</td>
              <td className="px-2 py-1 font-mono text-tiny">{item.receipt ?? "—"}</td>
              <td className="px-2 py-1 text-end">{item.status === "COLLECTED" && can.update ? <Button size="sm" variant="light" color="danger" isDisabled={pending} onPress={() => {
                const reason = window.prompt(t("returnPrompt"), "AC04");
                if (reason) call(() => markReturnedAction({ runId: run.id, itemId: item.id, reason }), t("returnedToast"));
              }}>{t("markReturned")}</Button> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {run.collectedAt ? <p className="text-tiny text-default-500">{t("collectedOn", { date: date(run.collectedAt) })}</p> : null}
    </div>
  );
}
