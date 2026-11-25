import type { CockpitRow } from "./run";

export const COMPLIANCE_DISCLAIMER = {
  tr: "İç kontrol listesi, vergi danışmanlığı değildir.",
  de: "Interne Checkliste, keine Steuerberatung.",
} as const;

const FACT_KEYS = ["value", "count", "daysUntil", "amountEur", "ratio"] as const;

/** #585: Hesaplanan değer etiketleri dile göre (önceden Türkçe/Almanca metinde İngilizce "value: 0" görünüyordu). */
const FACT_LABELS: Record<"tr" | "de", Record<(typeof FACT_KEYS)[number] | "yes" | "no", string>> = {
  tr: { value: "Değer", count: "Adet", daysUntil: "Kalan gün", amountEur: "Tutar (€)", ratio: "Oran", yes: "evet", no: "hayır" },
  de: { value: "Wert", count: "Anzahl", daysUntil: "Verbleibende Tage", amountEur: "Betrag (€)", ratio: "Quote", yes: "ja", no: "nein" },
};

export function formatComputedValue(facts: Record<string, unknown>, lang: "tr" | "de" = "de"): string {
  const labels = FACT_LABELS[lang];
  const number = new Intl.NumberFormat(lang === "de" ? "de-DE" : "tr-TR", { maximumFractionDigits: 2 });
  const parts: string[] = [];
  for (const k of FACT_KEYS) {
    const v = facts[k];
    if (typeof v === "number") parts.push(`${labels[k]}: ${number.format(v)}`);
    else if (typeof v === "boolean") parts.push(`${labels[k]}: ${v ? labels.yes : labels.no}`);
    else if (typeof v === "string") parts.push(`${labels[k]}: ${v}`);
  }
  return parts.length > 0 ? parts.join(", ") : "—";
}

/**
 * Builds markdown (with table for CSV/PDF compatibility) containing the StBerG disclaimer
 * on the header, every table row / section, and footer. Aggregates only, no PII.
 */
export function buildComplianceExportMarkdown(params: {
  year: number;
  lang: "tr" | "de";
  rows: readonly CockpitRow[];
  preview: boolean;
}): string {
  const { year, lang, rows, preview } = params;
  const disclaimer = COMPLIANCE_DISCLAIMER[lang];
  const heading = lang === "de" ? `Compliance-Check ${year}` : `Uyum kontrolü ${year}`;
  const previewLabel = preview
    ? lang === "de"
      ? "Vorschau (Entwurf enthalten)"
      : "Önizleme (taslak kurallar dahil)"
    : null;

  const lines: string[] = [
    `# ${heading}`,
    "",
    `> **${disclaimer}**`,
    ...(previewLabel ? [`> ${previewLabel}`] : []),
    "",
  ];

  const colRule = lang === "de" ? "Regel" : "Kural";
  const colVersion = lang === "de" ? "Version" : "Sürüm";
  const colEffective = lang === "de" ? "Gültig ab" : "Geçerlilik";
  const colStatus = lang === "de" ? "Status" : "Durum";
  const colValue = lang === "de" ? "Wert" : "Değer";
  const colSource = lang === "de" ? "Quelle" : "Kaynak";
  const colNote = lang === "de" ? "Hinweis" : "Not";

  lines.push(`| ${colRule} | ${colVersion} | ${colEffective} | ${colStatus} | ${colValue} | ${colSource} | ${colNote} |`);
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");

  for (const row of rows) {
    const norms = row.rule.legalSource.map((s) => (s.url ? `[${s.norm}](${s.url})` : s.norm)).join("; ");
    if (row.findings.length === 0) {
      lines.push(
        `| ${row.rule.title[lang]} | v${row.rule.version} | ${row.rule.effective.from} | ${row.mode} | — | ${norms} | ${disclaimer} |`,
      );
      continue;
    }
    for (const f of row.findings) {
      const msg = f.message ? f.message[lang] : f.status;
      const val = formatComputedValue(f.facts, lang);
      lines.push(
        `| ${row.rule.title[lang]} | v${row.rule.version} | ${row.rule.effective.from} | ${f.status} | ${val} | ${norms} | ${msg} (${disclaimer}) |`,
      );
    }
  }

  lines.push("", `---`, `*${disclaimer}*`);
  return lines.join("\n");
}
