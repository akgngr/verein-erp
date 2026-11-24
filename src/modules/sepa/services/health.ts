import "server-only";

import { canRequestRenewal, describeRenewal, type RenewalChannel, type RenewalStatus } from "@/modules/online-forms/server";
import { listUsableModuleKeys } from "@/modules/system/automation";
import type { Role } from "@/shared/roles";

import { checkMandate, coachAdvice, DEFAULT_MAX_RETURNS, isBlocked, needsRenewal, returnSummary, type HealthIssue } from "../lib/mandate-health";
import { isValidIban } from "../lib/pain008";
import { loadMandateHistory } from "./history";
import { candidates, creditorProblems, mask, type Source } from "./runs";

export type HealthRow = {
  /** Sunucu içi: yenileme hedefi. İstemciye gönderilmez (aşağıda çıkarılır). */
  subject?: { kind: "MEMBER" | "GUARDIAN"; subjectId: string } | null;
  sourceKey: string;
  label: string;
  amountCents: number;
  ibanMasked: string | null;
  mandateReference: string | null;
  mandateDate: string | null;
  issues: HealthIssue[];
  blocked: boolean;
  returns: { count: number; feeCents: number; latestCode: string | null };
  advice: ReturnType<typeof coachAdvice>["action"] | null;
  adviceCode: string | null;
  /** e-imza ile yetki yenileme (#521): gerekli mi, bu kullanıcı için mümkün mü, maskeli kanallar, son bağlantı. */
  renewal: { needed: boolean; available: boolean; channels: Partial<Record<RenewalChannel, string>>; last: RenewalStatus | null } | null;
};

/**
 * Mandate health scan for one collection source. IBANs are masked; nothing is written and nothing is sent.
 * Rows with no issue are left out; `checked` is the total number of debtors scanned.
 */
export async function mandateHealth(source: Source, param: string, labels: Parameters<typeof candidates>[2], maxReturns = DEFAULT_MAX_RETURNS, role: Role | null = null) {
  const list = await candidates(source, param, labels);
  const history = await loadMandateHistory(source, list);
  const today = new Date();
  const rows: HealthRow[] = [];
  for (const item of list) {
    const context = history.for(item);
    const issues = checkMandate(item, { today, maxReturns, ...context });
    if (!issues.length) continue;
    const summary = returnSummary(context.returns, today);
    const advice = summary.count ? coachAdvice(summary.latestCode) : null;
    const needed = needsRenewal(issues, advice?.action ?? null);
    rows.push({
      renewal: needed ? { needed, available: Boolean(item.subject), channels: {}, last: null } : null,
      subject: item.subject,
      sourceKey: item.sourceKey, label: item.label, amountCents: item.amountCents,
      ibanMasked: item.iban && isValidIban(item.iban) ? mask(item.iban.replace(/\s+/g, "")) : null,
      mandateReference: item.mandateReference, mandateDate: item.mandateDate,
      issues, blocked: isBlocked(issues), returns: summary, advice: advice?.action ?? null, adviceCode: advice?.code ?? null,
    });
  }
  // Yenileme bilgisi yalnız online-forms kurulu ve kullanıcı yetkiliyse (maskeli adresler, son bağlantı durumu).
  const usable = new Set(await listUsableModuleKeys());
  const renewable = rows.filter((row) => row.renewal && row.subject && role && usable.has("online-forms") && canRequestRenewal(role, row.subject.kind));
  const described = await describeRenewal(renewable.map((row) => row.subject!));
  for (const row of rows) {
    if (!row.renewal) continue;
    const info = row.subject ? described.get(`${row.subject.kind}:${row.subject.subjectId}`) : undefined;
    row.renewal = { needed: true, available: Boolean(info && renewable.includes(row) && Object.keys(info.channels).length), channels: info?.channels ?? {}, last: info?.last ?? null };
  }
  rows.sort((a, b) => Number(b.blocked) - Number(a.blocked) || b.returns.count - a.returns.count || a.label.localeCompare(b.label));
  return { checked: list.length, rows: rows.map(({ subject: _subject, ...row }) => row), creditor: await creditorProblems(), maxReturns };
}
