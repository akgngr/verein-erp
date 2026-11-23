import "server-only";

import { checkMandate, coachAdvice, DEFAULT_MAX_RETURNS, isBlocked, returnSummary, type HealthIssue } from "../lib/mandate-health";
import { isValidIban } from "../lib/pain008";
import { loadMandateHistory } from "./history";
import { candidates, creditorProblems, mask, type Source } from "./runs";

export type HealthRow = {
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
};

/**
 * Mandate health scan for one collection source. IBANs are masked; nothing is written and nothing is sent.
 * Rows with no issue are left out; `checked` is the total number of debtors scanned.
 */
export async function mandateHealth(source: Source, param: string, labels: Parameters<typeof candidates>[2], maxReturns = DEFAULT_MAX_RETURNS) {
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
    rows.push({
      sourceKey: item.sourceKey, label: item.label, amountCents: item.amountCents,
      ibanMasked: item.iban && isValidIban(item.iban) ? mask(item.iban.replace(/\s+/g, "")) : null,
      mandateReference: item.mandateReference, mandateDate: item.mandateDate,
      issues, blocked: isBlocked(issues), returns: summary, advice: advice?.action ?? null, adviceCode: advice?.code ?? null,
    });
  }
  rows.sort((a, b) => Number(b.blocked) - Number(a.blocked) || b.returns.count - a.returns.count || a.label.localeCompare(b.label));
  return { checked: list.length, rows, creditor: await creditorProblems(), maxReturns };
}
