import { z } from "zod";

/**
 * Muhasebe durum analizi kartının okuduğu araçlar. Hepsi accounting/ai.ts içindeki v2 toplam (aggregate /
 * internal) araçlardır: kişi adı, karşı taraf, IBAN veya açıklama döndürmez. Araçlar sohbetle AYNI kapılardan
 * geçer (modül onayı, AI izin matrisi, kullanıcı rolü, bulut veri politikası); kapalı olan araç atlanır.
 */
export const FINANCE_INSIGHT_TOOLS = [
  "get_accounting_summary",
  "get_open_items_summary",
  "get_payables_summary",
  "get_bank_inbox_summary",
] as const;

const resultSchema = z.object({
  status: z.enum(["good", "watch", "risk"]),
  headline: z.string().trim().min(1).max(160),
  points: z.array(z.string().trim().min(1).max(240)).min(1).max(4),
  actions: z.array(z.string().trim().min(1).max(200)).max(3).default([]),
}).strict();

export type FinanceInsightResult = z.infer<typeof resultSchema>;

/** Modelin cevabındaki ilk JSON nesnesini ayıklar (sağlayıcılar kod bloğu ekleyebilir). */
export function parseInsightJson(text: string): FinanceInsightResult | null {
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) return null;
  try {
    const parsed = resultSchema.safeParse(JSON.parse(match[0]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

