import { isValidIban } from "./pain008";

/**
 * SEPA mandate health and returned-debit coach (B001 Q2, #406). Pure functions only: no I/O, no IBAN in output.
 *
 * Rules (SEPA Core Rulebook):
 * - A mandate needs a reference and a signature date; the IBAN checksum is validated locally (no external lookup).
 * - A mandate expires when it is not used for 36 months (counted from the last collection, or from the signature
 *   date when it was never used).
 * - Return reason codes (ISO 20022 R-transactions) decide whether a retry is sensible or a new mandate is needed.
 */

export const DORMANCY_MONTHS = 36;
export const DEFAULT_MAX_RETURNS = 2;
export const RETURN_WINDOW_MONTHS = 12;

export type ReturnCategory = "account" | "funds" | "mandate" | "debtor" | "technical";
export type ReturnCodeInfo = {
  category: ReturnCategory;
  /** A new collection with the same mandate makes sense (e.g. insufficient funds). */
  retry: boolean;
  /** The mandate must be renewed or confirmed before the next collection. */
  renewMandate: boolean;
};

/** Common SEPA Core return codes. Texts live in `sepa.coach.codes.<CODE>` (TR/DE). */
export const RETURN_CODES = {
  AC01: { category: "account", retry: false, renewMandate: true }, // IBAN incorrect
  AC04: { category: "account", retry: false, renewMandate: true }, // account closed
  AC06: { category: "account", retry: false, renewMandate: false }, // account blocked
  AC13: { category: "account", retry: false, renewMandate: true }, // debtor account is a consumer account (B2B only)
  AG01: { category: "account", retry: false, renewMandate: true }, // direct debit not allowed on this account
  AM04: { category: "funds", retry: true, renewMandate: false }, // insufficient funds
  MD01: { category: "mandate", retry: false, renewMandate: true }, // no valid mandate
  MD06: { category: "debtor", retry: false, renewMandate: false }, // refund requested by debtor (8 weeks)
  MD07: { category: "debtor", retry: false, renewMandate: true }, // debtor deceased
  MS02: { category: "debtor", retry: false, renewMandate: false }, // refused by debtor
  MS03: { category: "technical", retry: true, renewMandate: false }, // reason not specified (bank)
  RR04: { category: "technical", retry: true, renewMandate: false }, // regulatory reason
  SL01: { category: "debtor", retry: false, renewMandate: false }, // specific service offered by debtor bank (blocked creditor)
} as const satisfies Record<string, ReturnCodeInfo>;
export type ReturnCode = keyof typeof RETURN_CODES;
export const RETURN_CODE_LIST = Object.keys(RETURN_CODES) as ReturnCode[];

export const isReturnCode = (value: string): value is ReturnCode => Object.hasOwn(RETURN_CODES, value);

export type HealthIssue =
  | "missingIban"
  | "invalidIban"
  | "missingReference"
  | "missingSignatureDate"
  | "futureSignatureDate"
  | "dormant"
  | "missingHolder"
  | "renewAfterReturn"
  | "pausedAfterReturns";
export const BLOCKING_ISSUES: ReadonlySet<HealthIssue> = new Set(["missingIban", "invalidIban", "missingReference", "missingSignatureDate", "futureSignatureDate", "dormant", "renewAfterReturn", "pausedAfterReturns"]);

export type MandateInput = { iban: string | null; holder: string | null; mandateReference: string | null; mandateDate: string | null };
export type ReturnEvent = { code: string | null; at: Date; feeCents: number | null };
export type HealthContext = {
  today: Date;
  /** Last successful collection with this mandate reference (SEPA history), if any. */
  lastCollectedAt: Date | null;
  /** Returns for this debtor (same source key), newest first or any order. */
  returns: ReturnEvent[];
  maxReturns: number;
};

export function addMonths(date: Date, months: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
  // Clamp to the month end (e.g. 31 Jan + 1 month = 28/29 Feb).
  if (result.getUTCDate() !== date.getUTCDate()) result.setUTCDate(0);
  return result;
}

const parseDay = (value: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Returns inside the rolling window, newest first. */
export function recentReturns(returns: ReturnEvent[], today: Date, windowMonths = RETURN_WINDOW_MONTHS): ReturnEvent[] {
  const since = addMonths(today, -windowMonths);
  return returns.filter((item) => item.at >= since).sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** Health issues of one mandate. Order is stable (most important first). */
export function checkMandate(mandate: MandateInput, context: HealthContext): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const iban = mandate.iban?.replace(/\s+/g, "") ?? "";
  if (!iban) issues.push("missingIban");
  else if (!isValidIban(iban)) issues.push("invalidIban");
  if (!mandate.mandateReference?.trim()) issues.push("missingReference");
  const signed = parseDay(mandate.mandateDate);
  if (!signed) issues.push("missingSignatureDate");
  else if (signed > context.today) issues.push("futureSignatureDate");
  if (signed && signed <= context.today) {
    const lastUse = context.lastCollectedAt && context.lastCollectedAt > signed ? context.lastCollectedAt : signed;
    if (addMonths(lastUse, DORMANCY_MONTHS) <= context.today) issues.push("dormant");
  }
  if (!mandate.holder?.trim()) issues.push("missingHolder");
  const recent = recentReturns(context.returns, context.today);
  const latest = recent[0];
  if (latest?.code && isReturnCode(latest.code) && RETURN_CODES[latest.code].renewMandate && !(signed && signed > latest.at)) issues.push("renewAfterReturn");
  if (recent.length >= Math.max(1, context.maxReturns)) issues.push("pausedAfterReturns");
  return issues;
}

export const isBlocked = (issues: readonly HealthIssue[]) => issues.some((issue) => BLOCKING_ISSUES.has(issue));

/** Totals for the coach panel: returns and bank fees in the window. */
export function returnSummary(returns: ReturnEvent[], today: Date) {
  const recent = recentReturns(returns, today);
  return { count: recent.length, feeCents: recent.reduce((sum, item) => sum + (item.feeCents ?? 0), 0), latestCode: recent[0]?.code ?? null };
}

/** Next step for the coach, by return code. Unknown codes fall back to a manual check. */
export function coachAdvice(code: string | null): { code: ReturnCode | null; info: ReturnCodeInfo | null; action: "retry" | "renewMandate" | "contactDebtor" | "manualCheck" } {
  if (!code || !isReturnCode(code)) return { code: null, info: null, action: "manualCheck" };
  const info = RETURN_CODES[code];
  return { code, info, action: info.renewMandate ? "renewMandate" : info.retry ? "retry" : "contactDebtor" };
}

/** Issues that a new signed mandate fixes (#521): offer the e-sign renewal link for these. */
export const RENEWAL_ISSUES: ReadonlySet<HealthIssue> = new Set(["missingIban", "invalidIban", "missingReference", "missingSignatureDate", "futureSignatureDate", "dormant", "renewAfterReturn"]);
export function needsRenewal(issues: readonly HealthIssue[], advice: ReturnType<typeof coachAdvice>["action"] | null): boolean {
  return advice === "renewMandate" || issues.some((issue) => RENEWAL_ISSUES.has(issue));
}
