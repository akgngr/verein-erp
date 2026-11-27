"use client";

import { Send, ShieldCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button, DateInput, Input, Label, Select, Spinner, StatusChip, TextField } from "@/shared/components/kit";
import { actionVariant } from "@/shared/components/ui/action-appearance";
import { notify } from "@/shared/components/ui/notify";
import { useTranslateMessage } from "@/shared/i18n/use-translate-message";

import { mandateHealthAction, requestMandateRenewalAction } from "../actions/sepa-actions";
import { DEFAULT_MAX_RETURNS } from "../lib/mandate-health";

type Health = Extract<Awaited<ReturnType<typeof mandateHealthAction>>, { ok: true }>["data"];
type Row = Health["rows"][number];
const THRESHOLDS = [1, 2, 3, 4, 5] as const;

/**
 * Mandate health check and returned-debit coach (B001 Q2). Read-only: it never writes or sends anything.
 * The reminder text is a draft to copy; sending stays a separate, explicit step outside this panel.
 */
export function MandateHealthPanel({ sources, defaults }: { sources: ("MEMBER_DUES" | "COURSE_FEES")[]; defaults: { year: string; until: string } }) {
  const t = useTranslations("sepa");
  const translate = useTranslateMessage();
  const format = useFormatter();
  const money = (cents: number) => format.number(cents / 100, { style: "currency", currency: "EUR" });
  const [source, setSource] = useState(sources[0] ?? "MEMBER_DUES");
  const [param, setParam] = useState({ MEMBER_DUES: defaults.year, COURSE_FEES: defaults.until });
  const [maxReturns, setMaxReturns] = useState<number>(DEFAULT_MAX_RETURNS);
  const [result, setResult] = useState<Health | null>(null);
  const [scanned, setScanned] = useState<{ source: typeof source; param: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!sources.length) return null;

  const run = () =>
    start(async () => {
      const response = await mandateHealthAction({ source, param: param[source], maxReturns });
      if (!response.ok) return void notify.error(translate(response.error));
      setResult(response.data);
      setScanned({ source, param: param[source] });
      setOpen(null);
    });

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-ink-200 p-4" aria-labelledby="sepa-health-title">
      <div>
        <h2 id="sepa-health-title" className="font-semibold">{t("health.title")}</h2>
        <p className="text-sm text-ink-500">{t("health.description")}</p>
      </div>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
        <Select id="sepa-health-source" value={source} onChange={(value) => { setSource(String(value ?? source) as typeof source); setResult(null); }}>
          <Label>{t("source")}</Label>
          {sources.map((key) => (
            <Select.Item key={key} id={key} textValue={String(t(`sources.${key}`))}>
              <Label>{t(`sources.${key}`)}</Label>
            </Select.Item>
          ))}
        </Select>
        {source === "MEMBER_DUES" ? (
          <TextField value={param.MEMBER_DUES} onChange={(value) => setParam({ ...param, MEMBER_DUES: value })} className="w-full">
            <Label>{t("year")}</Label>
            <Input placeholder=" " inputMode="numeric" />
          </TextField>
        ) : (
          <DateInput label={t("dueUntil")} ariaLabel={t("dueUntil")} value={param.COURSE_FEES} onChange={(value) => setParam({ ...param, COURSE_FEES: value })} className="w-full" />
        )}
        <Select id="sepa-health-threshold" value={String(maxReturns)} onChange={(value) => setMaxReturns(Number(value ?? maxReturns))}>
          <Label>{t("health.threshold")}</Label>
          {THRESHOLDS.map((value) => (
            <Select.Item key={value} id={String(value)} textValue={t("health.thresholdOption", { count: value })}>
              <Label>{t("health.thresholdOption", { count: value })}</Label>
            </Select.Item>
          ))}
        </Select>
        <Button onPress={run} variant={actionVariant("default", "solid")} isPending={pending}>
          {pending ? <Spinner size="sm" tone="current" /> : <ShieldCheck className="size-4" aria-hidden />}
          {t("health.check")}
        </Button>
      </div>
      {result ? (
        <div className="flex flex-col gap-3" role="status">
          {result.creditor.length ? <p className="text-sm text-warning-700">{result.creditor.map((key) => t(`errors.${key}` as never)).join(" ")}</p> : null}
          <p className="text-sm">{t("health.summary", { checked: result.checked, issues: result.rows.length, blocked: result.rows.filter((row) => row.blocked).length })}</p>
          {result.rows.length ? (
            <div className="max-h-[28rem] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface text-ink-500">
                  <tr>
                    {(["debtor", "iban", "mandate", "issues", "returns"] as const).map((key) => (
                      <th key={key} className="px-2 py-1 text-start font-medium">{t(`health.columns.${key}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <HealthRowView key={row.sourceKey} row={row} money={money} scan={scanned} open={open === row.sourceKey} onToggle={() => setOpen(open === row.sourceKey ? null : row.sourceKey)} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-success-700">{t("health.allGood")}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function HealthRowView({ row, money, scan, open, onToggle }: { row: Row; money: (cents: number) => string; scan: { source: "MEMBER_DUES" | "COURSE_FEES"; param: string } | null; open: boolean; onToggle: () => void }) {
  const t = useTranslations("sepa");
  const translate = useTranslateMessage();
  const channels = Object.entries(row.renewal?.channels ?? {}) as [string, string][];
  const [renewing, setRenewing] = useState<string | null>(null);
  const [last, setLast] = useState(row.renewal?.last ?? null);
  const [sending, startSending] = useTransition();
  const send = () =>
    scan && renewing &&
    startSending(async () => {
      const response = await requestMandateRenewalAction({ source: scan.source, param: scan.param, sourceKey: row.sourceKey, channel: renewing });
      if (!response.ok) return void notify.error(translate(response.error));
      notify.success(t("renewal.sent"));
      setLast({ status: "PENDING", sentAt: new Date().toISOString().slice(0, 10), completedAt: null });
      setRenewing(null);
    });
  const reminder = t("coach.reminderDraft", { reference: row.mandateReference ?? "—", amount: money(row.amountCents) });
  return (
    <>
      <tr className="border-t border-ink-100 align-top">
        <td className="px-2 py-1">{row.label}</td>
        <td className="px-2 py-1 font-mono text-xs">{row.ibanMasked ?? "—"}</td>
        <td className="px-2 py-1 font-mono text-xs">{row.mandateReference ?? "—"}</td>
        <td className="px-2 py-1">
          <ul className="flex flex-wrap gap-1">
            {row.issues.map((issue) => (
              <li key={issue}>
                <StatusChip tone={issue === "missingHolder" ? "warning" : "danger"}>{t(`health.issues.${issue}`)}</StatusChip>
              </li>
            ))}
          </ul>
        </td>
        <td className="px-2 py-1">
          {row.renewal ? (
            <div className="mb-1 flex flex-col items-start gap-1">
              {last ? <span className="text-xs text-ink-500">{t(`renewal.status.${last.status}`, { date: last.completedAt ?? last.sentAt })}</span> : null}
              {row.renewal.available && !renewing ? (
                <Button size="sm" variant={actionVariant("primary", "light")} onPress={() => setRenewing(channels[0]?.[0] ?? null)}>
                  <Send className="size-3.5" aria-hidden />
                  {t("renewal.request")}
                </Button>
              ) : !row.renewal.available ? (
                <span className="text-xs text-ink-400">{t("renewal.unavailable")}</span>
              ) : null}
            </div>
          ) : null}
          {row.returns.count ? (
            <Button size="sm" variant={actionVariant("default", "light")} onPress={onToggle} aria-expanded={open}>
              {t("health.returnsCell", { count: row.returns.count, fee: money(row.returns.feeCents) })}
            </Button>
          ) : (
            <span className="text-ink-400">—</span>
          )}
        </td>
      </tr>
      {renewing ? (
        <tr className="bg-primary-50">
          <td colSpan={5} className="px-3 py-2">
            <div className="flex flex-col gap-2 text-sm" role="group" aria-label={t("renewal.confirmTitle")}>
              <p className="font-medium">{t("renewal.confirmTitle")}</p>
              <p className="text-ink-600">{t("renewal.confirmText")}</p>
              <Select id={`sepa-renewal-${row.sourceKey}`} value={renewing} onChange={(value) => setRenewing(String(value ?? renewing))} className="max-w-sm">
                <Label>{t("renewal.channel")}</Label>
                {channels.map(([channel, masked]) => (
                  <Select.Item key={channel} id={channel} textValue={`${t(`renewal.channels.${channel}` as never)} · ${masked}`}>
                    <Label>{t(`renewal.channels.${channel}` as never)} · {masked}</Label>
                  </Select.Item>
                ))}
              </Select>
              <div className="flex gap-2">
                <Button size="sm" variant={actionVariant("primary", "solid")} onPress={send} isPending={sending}>{t("renewal.send")}</Button>
                <Button size="sm" variant={actionVariant("default", "light")} onPress={() => setRenewing(null)}>{t("renewal.cancel")}</Button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
      {open ? (
        <tr className="bg-ink-50">
          <td colSpan={5} className="px-3 py-2">
            <div className="flex flex-col gap-2 text-sm">
              {row.adviceCode ? (
                <p>
                  <strong className="font-mono">{row.adviceCode}</strong> · {t(`coach.codes.${row.adviceCode}` as never)}
                </p>
              ) : (
                <p>{t("coach.unknownCode")}</p>
              )}
              {row.advice ? <p className="font-medium">{t(`coach.actions.${row.advice}`)}</p> : null}
              <label className="flex flex-col gap-1">
                <span className="text-ink-500">{t("coach.reminderLabel")}</span>
                <textarea readOnly className="min-h-24 w-full rounded border border-ink-200 bg-surface p-2" value={reminder} />
              </label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={actionVariant("primary", "flat")} onPress={() => void navigator.clipboard?.writeText(reminder).then(() => notify.success(t("coach.copied")))}>
                  {t("coach.copy")}
                </Button>
                <span className="text-xs text-ink-500">{t("coach.draftOnly")}</span>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
