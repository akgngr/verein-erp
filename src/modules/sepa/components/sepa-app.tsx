"use client";

import { notify } from "@/shared/components/ui/notify";
import { DateInput, Input, Label, Select, Spinner, StatusChip, TextField, Button, buttonClassName, TextLink as ActionLink } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Download, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import {
  cancelRunAction,
  createRunAction,
  markCollectedAction,
  markReturnedAction,
  previewRunAction,
} from "../actions/sepa-actions";
import { RETURN_CODE_LIST } from "../lib/mandate-health";

type Preview = Extract<
  Awaited<ReturnType<typeof previewRunAction>>,
  { ok: true }
>["data"];
type RunRow = {
  id: string;
  number: string;
  source: "MEMBER_DUES" | "COURSE_FEES";
  sourceParam: string;
  collectionDate: string;
  status: "CREATED" | "COLLECTED" | "CANCELLED";
  totalCents: number;
  itemCount: number;
  returned: number;
  createdAt: string;
  createdByLabel: string;
};
const STATUS_COLOR = {
  CREATED: "primary",
  COLLECTED: "success",
  CANCELLED: "default",
  PENDING: "default",
  RETURNED: "danger",
} as const;

function useMoney() {
  const format = useFormatter();
  return {
    money: (cents: number) =>
      format.number(cents / 100, { style: "currency", currency: "EUR" }),
    date: (value: string) =>
      format.dateTime(new Date(`${value}T12:00:00`), { dateStyle: "medium" }),
  };
}

/** /sepa: yeni tahsilat (önizlemeli) ve geçmiş çalıştırmalar. */
export function SepaApp({
  runs,
  defaults,
  sources,
  problems,
  canCreate,
}: {
  runs: RunRow[];
  defaults: { year: string; until: string; collectionDate: string };
  sources: ("MEMBER_DUES" | "COURSE_FEES")[];
  problems: string[];
  canCreate: boolean;
}) {
  const t = useTranslations("sepa");
  const translate = useTranslateMessage();
  const router = useRouter();
  const hydrated = useHydrated();
  const { money, date } = useMoney();
  const [source, setSource] = useState(sources[0] ?? "MEMBER_DUES");
  const [param, setParam] = useState({
    MEMBER_DUES: defaults.year,
    COURSE_FEES: defaults.until,
  });
  const [collectionDate, setCollectionDate] = useState(defaults.collectionDate);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, start] = useTransition();

  if (!hydrated) return null;
  return (
    <div className="flex flex-col gap-6">
      {problems.length ? (
        <div className="rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
          {problems.map((key) => t(`errors.${key}` as never)).join(" ")}{" "}
          <Link className="underline" href="/muhasebe/faturalar?yeni=ayarlar">
            {t("openSettings")}
          </Link>
        </div>
      ) : null}
      {canCreate && sources.length ? (
        <section className="flex flex-col gap-4 rounded-xl border border-ink-200 p-4">
          <h2 className="font-semibold">{t("newRun")}</h2>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
            <Select
              id="sepa-source"
              value={source}
              onChange={(selectedValue) => {
                const keys =
                  selectedValue === null ? undefined : String(selectedValue);
                setSource(String(keys ?? source) as typeof source);
                setPreview(null);
              }}
            >
              <Label>{t("source")}</Label>
                  {sources.map((key) => (
                    <Select.Item
                      key={key}
                      id={key}
                      textValue={String(t(`sources.${key}`))}
                    >
                      <Label>{t(`sources.${key}`)}</Label>
                    </Select.Item>
                  ))}
            </Select>
            {source === "MEMBER_DUES" ? (
              <TextField
                value={param.MEMBER_DUES}
                onChange={(value) => {
                  setParam({ ...param, MEMBER_DUES: value });
                  setPreview(null);
                }}
                className={["w-full"].filter(Boolean).join(" ")}
              >
                <Label>{t("year")}</Label>
                <Input placeholder=" " inputMode="numeric" />
              </TextField>
            ) : (
              <DateInput
                label={t("dueUntil")}
                ariaLabel={t("dueUntil")}
                value={param.COURSE_FEES}
                onChange={(value) => {
                  setParam({ ...param, COURSE_FEES: value });
                  setPreview(null);
                }}
                className="w-full"
              />
            )}
            <DateInput
              label={t("collectionDate")}
              ariaLabel={t("collectionDate")}
              value={collectionDate}
              onChange={setCollectionDate}
              description={t("collectionHelp")}
              className="w-full"
            />
            <Button
              onPress={() =>
                start(async () => {
                  const response = await previewRunAction({
                    source,
                    param: param[source],
                  });
                  if (!response.ok)
                    return void notify.error(translate(response.error));
                  setPreview(response.data);
                })
              }
              variant={actionVariant("default", "solid")}
              isPending={pending}
            >
              {pending ? <Spinner size="sm" tone="current" /> : null}
              {<Search className="size-4" />}
              {t("preview")}
            </Button>
          </div>
          {preview ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                {t("previewSummary", {
                  count: preview.ready.length,
                  total: money(preview.totalCents),
                  skipped: preview.skipped.length,
                })}
              </p>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface text-ink-500">
                    <tr>
                      {(["debtor", "iban", "mandate", "amount"] as const).map(
                        (key) => (
                          <th
                            key={key}
                            className="px-2 py-1 text-start font-medium"
                          >
                            {t(`columns.${key}`)}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.ready.map((item) => (
                      <tr
                        key={item.sourceKey}
                        className="border-t border-ink-100"
                      >
                        <td className="px-2 py-1">{item.label}</td>
                        <td className="px-2 py-1 font-mono text-xs">
                          <span>{item.ibanMasked}</span>
                          {item.ibanAmended ? (
                            <StatusChip tone="warning" className="ms-2">
                              {t("ibanAmended")}
                            </StatusChip>
                          ) : null}
                        </td>
                        <td className="px-2 py-1 font-mono text-xs">
                          {item.mandateReference}
                        </td>
                        <td className="px-2 py-1">{money(item.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.skipped.length ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-warning-600">
                    {t("skippedTitle", { count: preview.skipped.length })}
                  </summary>
                  <ul className="mt-2 list-disc ps-5 text-ink-600">
                    {preview.skipped.map((item, index) => (
                      <li key={index}>
                        {item.label} · {money(item.amountCents)} ·{" "}
                        {t(`skip.${item.reason}`)}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <Button
                className="self-start"
                isDisabled={
                  !preview.ready.length || preview.problems.length > 0
                }
                onPress={() =>
                  start(async () => {
                    const response = await createRunAction({
                      source,
                      param: param[source],
                      collectionDate,
                      sourceKeys: null,
                    });
                    if (!response.ok)
                      return void notify.error(translate(response.error));
                    notify.success(t("created", { number: response.data.number }));
                    router.push(`/muhasebe/sepa/${response.data.id}`);
                  })
                }
                variant={actionVariant("primary", "solid")}
                isPending={pending}
              >
                {pending ? <Spinner size="sm" tone="current" /> : null}
                {t("createRun")}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t("history")}</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-ink-500">{t("empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-ink-500">
              <tr>
                {(
                  [
                    "number",
                    "source",
                    "collectionDate",
                    "items",
                    "total",
                    "status",
                  ] as const
                ).map((key) => (
                  <th key={key} className="px-2 py-1 text-start font-medium">
                    {t(`columns.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-ink-100">
                  <td className="px-2 py-1">
                    <Link
                      className="font-mono text-accent hover:underline"
                      href={`/muhasebe/sepa/${run.id}`}
                    >
                      {run.number}
                    </Link>
                  </td>
                  <td className="px-2 py-1">
                    {t(`sources.${run.source}`)} · {run.sourceParam}
                  </td>
                  <td className="px-2 py-1">{date(run.collectionDate)}</td>
                  <td className="px-2 py-1">
                    {run.itemCount}
                    {run.returned ? (
                      <span className="text-danger">
                        {" "}
                        ({t("returnedCount", { count: run.returned })})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1">{money(run.totalCents)}</td>
                  <td className="px-2 py-1">
                    <StatusChip tone={STATUS_COLOR[run.status]}
                    >
                      {t(`status.${run.status}`)}
                    </StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

type RunDetail = {
  id: string;
  number: string;
  status: "CREATED" | "COLLECTED" | "CANCELLED";
  collectionDate: string;
  collectedAt: string | null;
  totalCents: number;
  items: {
    id: string;
    debtorName: string;
    ibanMasked: string;
    mandateReference: string;
    amountCents: number;
    endToEndId: string;
    status: "PENDING" | "COLLECTED" | "RETURNED";
    receipt: string | null;
    returnReason: string | null;
    returnCode: string | null;
    returnFeeCents: number | null;
  }[];
};

/** /sepa/<id>: XML indirme, tahsil edildi işaretleme, geri dönen kalemler. */
export function SepaRunDetail({
  run,
  can,
}: {
  run: RunDetail;
  can: { download: boolean; update: boolean; cancel: boolean };
}) {
  const t = useTranslations("sepa");
  const translate = useTranslateMessage();
  const router = useRouter();
  const { money, date } = useMoney();
  const [collectedAt, setCollectedAt] = useState(run.collectionDate);
  const [returning, setReturning] = useState<{ itemId: string; code: string; fee: string; reason: string } | null>(null);
  const [pending, start] = useTransition();
  const call = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    done?: string,
  ) =>
    start(async () => {
      const response = await fn();
      if (!response.ok)
        return void notify.error(translate(response.error));
      if (done) notify.success(done);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <StatusChip tone={STATUS_COLOR[run.status]}
        >
          {t(`status.${run.status}`)}
        </StatusChip>
        <span className="text-sm text-ink-600">
          {t("collectionDate")}: {date(run.collectionDate)} ·{" "}
          {money(run.totalCents)}
        </span>
        {can.download && run.status !== "CANCELLED" ? (
          <ActionLink
            href={`/api/sepa/${run.id}/xml`}
            className={buttonClassName({
              variant: actionVariant("primary", "flat"),
            })}
          >
            {<Download className="size-4" />}
            {t("downloadXml")}
          </ActionLink>
        ) : null}
      </div>
      {run.status === "CREATED" ? (
        <p className="text-sm text-ink-500">{t("uploadHint")}</p>
      ) : null}
      {run.status === "CREATED" && can.update ? (
        <div className="flex flex-wrap items-end gap-2">
          <DateInput
            label={t("collectedAt")}
            ariaLabel={t("collectedAt")}
            value={collectedAt}
            onChange={setCollectedAt}
            className="max-w-[200px]"
          />
          <Button
            onPress={() =>
              window.confirm(
                t("collectConfirm", { count: run.items.length }),
              ) &&
              call(
                () => markCollectedAction({ id: run.id, collectedAt }),
                t("collectedToast"),
              )
            }
            variant={actionVariant("success", "solid")}
            isPending={pending}
          >
            {pending ? <Spinner size="sm" tone="current" /> : null}
            {t("markCollected")}
          </Button>
          {can.cancel ? (
            <Button
              isDisabled={pending}
              onPress={() =>
                window.confirm(t("cancelConfirm")) &&
                call(() => cancelRunAction({ id: run.id }))
              }
              variant={actionVariant("danger", "light")}
            >
              {t("cancelRun")}
            </Button>
          ) : null}
        </div>
      ) : null}
      <table className="w-full text-sm">
        <thead className="text-ink-500">
          <tr>
            {(
              [
                "debtor",
                "iban",
                "mandate",
                "amount",
                "status",
                "receipt",
                "",
              ] as const
            ).map((key) => (
              <th key={key} className="px-2 py-1 text-start font-medium">
                {key ? t(`columns.${key}`) : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {run.items.map((item) => (
            <tr key={item.id} className="border-t border-ink-100">
              <td className="px-2 py-1">
                {item.debtorName}
                <span className="block font-mono text-xs text-ink-400">
                  {item.endToEndId}
                </span>
              </td>
              <td className="px-2 py-1 font-mono text-xs">{item.ibanMasked}</td>
              <td className="px-2 py-1 font-mono text-xs">
                {item.mandateReference}
              </td>
              <td className="px-2 py-1">{money(item.amountCents)}</td>
              <td className="px-2 py-1">
                <StatusChip tone={STATUS_COLOR[item.status]}
                >
                  {t(`itemStatus.${item.status}`)}
                </StatusChip>
                {item.returnReason || item.returnCode ? (
                  <span className="block text-xs text-danger">
                    {[item.returnCode, item.returnReason !== item.returnCode ? item.returnReason : null, item.returnFeeCents ? money(item.returnFeeCents) : null].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </td>
              <td className="px-2 py-1 font-mono text-xs">
                {item.receipt ?? "—"}
              </td>
              <td className="px-2 py-1 text-end">
                {item.status === "COLLECTED" && can.update ? (
                  <Button
                    size="sm"
                    isDisabled={pending}
                    onPress={() => setReturning({ itemId: item.id, code: "AM04", fee: "", reason: "" })}
                    variant={actionVariant("danger", "light")}
                  >
                    {t("markReturned")}
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {returning ? (
        <form
          className="flex flex-col gap-3 rounded-lg border border-danger-200 p-3"
          aria-label={t("returnForm.title")}
          onSubmit={(event) => {
            event.preventDefault();
            const fee = returning.fee.trim() ? Math.round(Number(returning.fee.replace(",", ".")) * 100) : null;
            if (fee !== null && (!Number.isFinite(fee) || fee < 0)) return void notify.error(t("returnForm.feeInvalid"));
            call(() => markReturnedAction({ runId: run.id, itemId: returning.itemId, code: returning.code, feeCents: fee, reason: returning.reason }), t("returnedToast"));
            setReturning(null);
          }}
        >
          <h3 className="font-medium">{t("returnForm.title")}</h3>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
            <Select id="sepa-return-code" value={returning.code} onChange={(value) => setReturning({ ...returning, code: String(value ?? returning.code) })}>
              <Label>{t("returnForm.code")}</Label>
              {RETURN_CODE_LIST.map((code) => (
                <Select.Item key={code} id={code} textValue={`${code} · ${t(`coach.codes.${code}` as never)}`}>
                  <Label>{code} · {t(`coach.codes.${code}` as never)}</Label>
                </Select.Item>
              ))}
            </Select>
            <TextField value={returning.fee} onChange={(fee) => setReturning({ ...returning, fee })} className="w-full">
              <Label>{t("returnForm.fee")}</Label>
              <Input inputMode="decimal" placeholder=" " />
            </TextField>
            <TextField value={returning.reason} onChange={(reason) => setReturning({ ...returning, reason })} className="w-full">
              <Label>{t("returnForm.note")}</Label>
              <Input placeholder=" " maxLength={200} />
            </TextField>
          </div>
          <p className="text-xs text-ink-500">{t("returnForm.hint")}</p>
          <div className="flex gap-2">
            <Button type="submit" variant={actionVariant("danger", "solid")} isPending={pending}>{t("markReturned")}</Button>
            <Button variant={actionVariant("default", "light")} onPress={() => setReturning(null)}>{t("returnForm.cancel")}</Button>
          </div>
        </form>
      ) : null}
      {run.collectedAt ? (
        <p className="text-xs text-ink-500">
          {t("collectedOn", { date: date(run.collectedAt) })}
        </p>
      ) : null}
    </div>
  );
}
