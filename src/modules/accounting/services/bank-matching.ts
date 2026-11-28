/**
 * ACC-4 / #616 eşleştirme önerileri (saf): her öneri bir puan ve GEREKÇE listesi taşır; kullanıcı onaylar.
 * - Gelen tutar ↔ açık fatura: fatura no. açıklamada (+60), tutar = açık tutar (+30), ad benzer (+10).
 * - Gelen tutar ↔ açık üye aidatı: üye no./mandat ref (+60), IBAN (+50), tutar = açık tutar (+30), ad (+10), yıl (+5).
 * - Gelen tutar ↔ açık kurs ücreti: kurs kodu/öğrenci/debitor no. (+60), tam tutar (+30), ödeyen/öğrenci adı (+10).
 * - Gelen tutar ↔ bağış: bağışçı kodu (+60), bağış anahtar kelimesi (+40), bağışçı adı (+20).
 * - Kurallar (öğrenilmiş): karşı taraf / açıklama içerir → kategori + KDV oranı.
 */
export type MatchInvoice = { id: string; number: string | null; recipientName: string; openCents: number };
export type MatchPayable = { id: string; number: string | null; supplierName: string; openCents: number };
export type MatchRule = { id: string; field: "COUNTERPARTY" | "PURPOSE"; pattern: string; direction: "INCOME" | "EXPENSE"; categoryId: string; taxRate: number };
export type MatchMemberDue = {
  dueId: string;
  memberId: string;
  year: number;
  membershipNumber: string;
  name: string;
  openCents: number;
  iban?: string | null;
  accountHolder?: string | null;
  mandateReference?: string | null;
};
export type MatchCourseCharge = {
  chargeId: string;
  courseCode: string;
  label: string;
  amountCents: number;
  studentLabel: string;
  studentNumber?: string | null;
  payerLabel?: string | null;
  payerDebtorNumber?: number | null;
};
export type MatchDonor = {
  id: string;
  donorCode: string;
  name: string;
};
export type MatchExtras = {
  memberDues?: MatchMemberDue[];
  courseCharges?: MatchCourseCharge[];
  donors?: MatchDonor[];
  allowOneClickDonation?: boolean;
};

export type MatchTransaction = {
  amountCents: number;
  counterpartyName: string | null;
  purpose: string;
  counterpartyIban?: string | null;
  reference?: string | null;
};

export type MatchReason =
  | "invoiceNumber"
  | "amount"
  | "name"
  | "rule"
  | "memberNumber"
  | "iban"
  | "courseCode"
  | "debtorNumber"
  | "donationKeyword"
  | "donor";

export type Suggestion =
  | { kind: "invoice"; invoiceId: string; score: number; reasons: MatchReason[] }
  | { kind: "payable"; payableId: string; score: number; reasons: MatchReason[] }
  | { kind: "memberDue"; dueId: string; memberId: string; year: number; score: number; reasons: MatchReason[] }
  | { kind: "courseCharge"; chargeId: string; score: number; reasons: MatchReason[] }
  | { kind: "donation"; donorId: string | null; score: number; reasons: MatchReason[] }
  | { kind: "rule"; ruleId: string; categoryId: string; taxRate: number; score: number; reasons: MatchReason[] };

/** Bankalar umlaut'ları çoğu zaman "ae/oe/ue/ss" yazar; iki taraf da aynı biçime getirilir. */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compactStr = (value: string) => normalize(value).replace(/\s/g, "");

const normalizeIban = (iban: string | null | undefined) =>
  (iban ?? "").replace(/\s+/g, "").toUpperCase();

const tokens = (value: string) =>
  new Set(
    normalize(value)
      .split(" ")
      .filter(
        (token) =>
          token.length >= 3 &&
          !["gmbh", "und", "the", "mbh", "e.v", "ug", "herr", "frau"].includes(token),
      ),
  );

const DONATION_KEYWORD_RE =
  /\b(spende|spenden|zuwendung|zuwendungen|bagis|bagisi|donation|donations|foerderbeitrag|foerderung|sadaka|zekat|fitre)\b/;

export function filterOpenPayablesForDirection<T extends { openCents: number }>(
  payables: readonly T[],
  bankAmountCents: number,
): T[] {
  if (bankAmountCents > 0) return payables.filter((p) => p.openCents < 0);
  if (bankAmountCents < 0) return payables.filter((p) => p.openCents > 0);
  return [];
}

export function canMatchPayableToBankAmount(
  openCents: number,
  bankAmountCents: number,
): boolean {
  if (bankAmountCents > 0) {
    return openCents < 0 && Math.abs(openCents) >= bankAmountCents;
  }
  if (bankAmountCents < 0) {
    return openCents > 0 && openCents >= Math.abs(bankAmountCents);
  }
  return false;
}

function scorePayables(
  payables: MatchPayable[],
  amount: number,
  isIncomingCreditNote: boolean,
  text: string,
  compact: string,
  nameTokens: Set<string>,
  suggestions: Suggestion[],
) {
  for (const payable of payables) {
    if (isIncomingCreditNote ? payable.openCents >= 0 : payable.openCents <= 0) continue;
    const openAbs = Math.abs(payable.openCents);
    const reasons: MatchReason[] = [];
    let score = 0;
    if (
      payable.number &&
      compactStr(payable.number).length >= 3 &&
      compact.includes(compactStr(payable.number))
    ) {
      reasons.push("invoiceNumber");
      score += 60;
    }
    if (openAbs === amount) {
      reasons.push("amount");
      score += 30;
    }
    if ([...tokens(payable.supplierName)].some((token) => nameTokens.has(token) || text.includes(token))) {
      reasons.push("name");
      score += 10;
    }
    if (score >= 30 && openAbs >= amount) {
      suggestions.push({ kind: "payable", payableId: payable.id, score, reasons });
    }
  }
}

export function suggestMatches(
  tx: MatchTransaction,
  invoices: MatchInvoice[],
  rules: MatchRule[],
  payables: MatchPayable[] = [],
  extras: MatchExtras = {},
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const text = normalize(`${tx.purpose} ${tx.counterpartyName ?? ""} ${tx.reference ?? ""}`);
  const compact = text.replace(/\s/g, "");
  const txIban = normalizeIban(tx.counterpartyIban);

  if (tx.amountCents > 0) {
    const nameTokens = tokens(tx.counterpartyName ?? "");

    for (const invoice of invoices) {
      const reasons: MatchReason[] = [];
      let score = 0;
      if (invoice.number && compact.includes(compactStr(invoice.number))) {
        reasons.push("invoiceNumber");
        score += 60;
      }
      if (invoice.openCents === tx.amountCents) {
        reasons.push("amount");
        score += 30;
      }
      const recipient = tokens(invoice.recipientName);
      if ([...recipient].some((token) => nameTokens.has(token) || text.includes(token))) {
        reasons.push("name");
        score += 10;
      }
      // Yalnızca ad benzerliği öneri için yeterli değil.
      if (score >= 30 && invoice.openCents >= tx.amountCents) {
        suggestions.push({ kind: "invoice", invoiceId: invoice.id, score, reasons });
      }
    }

    // Açık tedarikçi alacak dekontları (iade gelen ödeme): openCents < 0.
    scorePayables(payables, tx.amountCents, true, text, compact, nameTokens, suggestions);

    // Open MemberDue suggestions (#616): never propose if bank inflow exceeds openCents.
    for (const due of extras.memberDues ?? []) {
      if (due.openCents < tx.amountCents) continue;
      const reasons: MatchReason[] = [];
      let score = 0;

      const memberNumCompact = compactStr(due.membershipNumber);
      const mandateCompact = due.mandateReference ? compactStr(due.mandateReference) : "";
      if (
        (memberNumCompact.length >= 4 && compact.includes(memberNumCompact)) ||
        (mandateCompact.length >= 5 && compact.includes(mandateCompact))
      ) {
        reasons.push("memberNumber");
        score += 60;
      }
      const dueIban = normalizeIban(due.iban);
      if (txIban.length >= 15 && dueIban.length >= 15 && txIban === dueIban) {
        reasons.push("iban");
        score += 50;
      }
      if (due.openCents === tx.amountCents) {
        reasons.push("amount");
        score += 30;
      }
      const memberTokens = tokens(`${due.name} ${due.accountHolder ?? ""}`);
      if (
        memberTokens.size > 0 &&
        [...memberTokens].some((token) => nameTokens.has(token) || text.includes(token))
      ) {
        reasons.push("name");
        score += 10;
      }
      if (score > 0 && text.includes(String(due.year))) {
        score += 5;
      }
      // Require strong identifier (memberNumber/IBAN) or exact amount + name match to avoid noise.
      const hasStrongId = reasons.includes("memberNumber") || reasons.includes("iban");
      const hasAmountAndName = reasons.includes("amount") && reasons.includes("name");
      if ((hasStrongId && score >= 50) || (hasAmountAndName && score >= 40)) {
        suggestions.push({
          kind: "memberDue",
          dueId: due.dueId,
          memberId: due.memberId,
          year: due.year,
          score,
          reasons,
        });
      }
    }

    // Open CourseCharge suggestions (#616): CourseCharge requires exact amount match.
    for (const charge of extras.courseCharges ?? []) {
      if (charge.amountCents !== tx.amountCents) continue;
      const reasons: MatchReason[] = [];
      let score = 30;
      reasons.push("amount");

      const codeCompact = compactStr(charge.courseCode);
      if (codeCompact.length >= 4 && compact.includes(codeCompact)) {
        reasons.push("courseCode");
        score += 60;
      }
      const studentNumCompact = charge.studentNumber ? compactStr(charge.studentNumber) : "";
      const debtorStr = charge.payerDebtorNumber ? String(charge.payerDebtorNumber) : "";
      if (
        (studentNumCompact.length >= 4 && compact.includes(studentNumCompact)) ||
        (debtorStr.length >= 4 && text.includes(debtorStr))
      ) {
        reasons.push("debtorNumber");
        score += 55;
      }
      const partyTokens = tokens(`${charge.payerLabel ?? ""} ${charge.studentLabel}`);
      if (
        partyTokens.size > 0 &&
        [...partyTokens].some((token) => nameTokens.has(token) || text.includes(token))
      ) {
        reasons.push("name");
        score += 15;
      }
      // Must match more than amount alone (code, debtor/student number, or party name).
      if (score >= 45) {
        suggestions.push({
          kind: "courseCharge",
          chargeId: charge.chargeId,
          score,
          reasons,
        });
      }
    }

    // Donation suggestions (#616): matched donor code/name and/or charitable transfer keywords.
    const donors = extras.donors ?? [];
    const allowDonation = extras.allowOneClickDonation ?? donors.length > 0;
    if (allowDonation) {
      const hasDonationKeyword = DONATION_KEYWORD_RE.test(text);
      let bestDonor: { donorId: string; score: number; reasons: MatchReason[] } | null = null;

      for (const donor of donors) {
        const reasons: MatchReason[] = [];
        let score = 0;
        const donorCodeCompact = compactStr(donor.donorCode);
        if (donorCodeCompact.length >= 4 && compact.includes(donorCodeCompact)) {
          reasons.push("donor");
          score += 60;
        }
        if (hasDonationKeyword) {
          reasons.push("donationKeyword");
          score += 40;
        }
        const donorTokens = tokens(donor.name);
        if (
          donorTokens.size > 0 &&
          [...donorTokens].some((token) => nameTokens.has(token) || text.includes(token))
        ) {
          reasons.push("name");
          score += 20;
        }
        const hasSignal = reasons.includes("donor") || (hasDonationKeyword && reasons.includes("name"));
        if (hasSignal && (!bestDonor || score > bestDonor.score)) {
          bestDonor = { donorId: donor.id, score, reasons };
        }
      }

      if (bestDonor) {
        suggestions.push({
          kind: "donation",
          donorId: bestDonor.donorId,
          score: bestDonor.score,
          reasons: bestDonor.reasons,
        });
      } else if (hasDonationKeyword) {
        suggestions.push({
          kind: "donation",
          donorId: null,
          score: 45,
          reasons: ["donationKeyword"],
        });
      }
    }
  }

  if (tx.amountCents < 0) {
    // Giden ödeme ↔ açık gelen fatura (ACC-5): aynı puanlama, tutar mutlak değerle.
    const amount = -tx.amountCents;
    const nameTokens = tokens(tx.counterpartyName ?? "");
    scorePayables(payables, amount, false, text, compact, nameTokens, suggestions);
  }

  const direction = tx.amountCents >= 0 ? "INCOME" : "EXPENSE";
  for (const rule of rules) {
    if (rule.direction !== direction) continue;
    const haystack = normalize(rule.field === "COUNTERPARTY" ? tx.counterpartyName ?? "" : tx.purpose);
    if (normalize(rule.pattern) && haystack.includes(normalize(rule.pattern))) {
      suggestions.push({
        kind: "rule",
        ruleId: rule.id,
        categoryId: rule.categoryId,
        taxRate: rule.taxRate,
        score: 50,
        reasons: ["rule"],
      });
    }
  }
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
}
