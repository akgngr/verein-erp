/**
 * ACC-4 eşleştirme önerileri (saf): her öneri bir puan ve GEREKÇE listesi taşır; kullanıcı onaylar.
 * - Gelen tutar ↔ açık fatura: fatura no. açıklamada (+60), tutar = açık tutar (+30), ad benzer (+10).
 * - Kurallar (öğrenilmiş): karşı taraf / açıklama içerir → kategori + KDV oranı.
 */
export type MatchInvoice = { id: string; number: string | null; recipientName: string; openCents: number };
export type MatchPayable = { id: string; number: string | null; supplierName: string; openCents: number };
export type MatchRule = { id: string; field: "COUNTERPARTY" | "PURPOSE"; pattern: string; direction: "INCOME" | "EXPENSE"; categoryId: string; taxRate: number };
export type MatchTransaction = { amountCents: number; counterpartyName: string | null; purpose: string };

export type MatchReason = "invoiceNumber" | "amount" | "name" | "rule";
export type Suggestion =
  | { kind: "invoice"; invoiceId: string; score: number; reasons: MatchReason[] }
  | { kind: "payable"; payableId: string; score: number; reasons: MatchReason[] }
  | { kind: "rule"; ruleId: string; categoryId: string; taxRate: number; score: number; reasons: MatchReason[] };

/** Bankalar umlaut'ları çoğu zaman "ae/oe/ue/ss" yazar; iki taraf da aynı biçime getirilir. */
const normalize = (value: string) => value.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (value: string) => new Set(normalize(value).split(" ").filter((token) => token.length >= 3 && !["gmbh", "und", "the", "mbh", "e.v", "ug"].includes(token)));

export function suggestMatches(tx: MatchTransaction, invoices: MatchInvoice[], rules: MatchRule[], payables: MatchPayable[] = []): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const text = normalize(`${tx.purpose} ${tx.counterpartyName ?? ""}`);
  const compact = text.replace(/\s/g, "");
  if (tx.amountCents > 0) {
    const nameTokens = tokens(tx.counterpartyName ?? "");
    for (const invoice of invoices) {
      const reasons: MatchReason[] = [];
      let score = 0;
      if (invoice.number && compact.includes(normalize(invoice.number).replace(/\s/g, ""))) {
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
      if (score >= 30 && invoice.openCents >= tx.amountCents) suggestions.push({ kind: "invoice", invoiceId: invoice.id, score, reasons });
    }
  }
  if (tx.amountCents < 0) {
    // Giden ödeme ↔ açık gelen fatura (ACC-5): aynı puanlama, tutar mutlak değerle.
    const amount = -tx.amountCents;
    const nameTokens = tokens(tx.counterpartyName ?? "");
    for (const payable of payables) {
      const reasons: MatchReason[] = [];
      let score = 0;
      if (payable.number && normalize(payable.number).replace(/\s/g, "").length >= 3 && compact.includes(normalize(payable.number).replace(/\s/g, ""))) {
        reasons.push("invoiceNumber");
        score += 60;
      }
      if (payable.openCents === amount) {
        reasons.push("amount");
        score += 30;
      }
      if ([...tokens(payable.supplierName)].some((token) => nameTokens.has(token) || text.includes(token))) {
        reasons.push("name");
        score += 10;
      }
      if (score >= 30 && payable.openCents >= amount) suggestions.push({ kind: "payable", payableId: payable.id, score, reasons });
    }
  }
  const direction = tx.amountCents >= 0 ? "INCOME" : "EXPENSE";
  for (const rule of rules) {
    if (rule.direction !== direction) continue;
    const haystack = normalize(rule.field === "COUNTERPARTY" ? tx.counterpartyName ?? "" : tx.purpose);
    if (normalize(rule.pattern) && haystack.includes(normalize(rule.pattern))) {
      suggestions.push({ kind: "rule", ruleId: rule.id, categoryId: rule.categoryId, taxRate: rule.taxRate, score: 50, reasons: ["rule"] });
    }
  }
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
}
