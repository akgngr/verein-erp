import type { CockpitRow } from "./run";

export const COMPLIANCE_DISCLAIMER = {
  tr: "İç kontrol listesi, vergi danışmanlığı değildir.",
  de: "Interne Checkliste, keine Steuerberatung.",
} as const;

export function formatComputedValue(facts: Record<string, unknown>): string {
  const keys = ["value", "count", "daysUntil", "amountEur", "ratio"] as const;
  const parts: string[] = [];
  for (const k of keys) {
    const v = facts[k];
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      parts.push(`${k}: ${String(v)}`);
    }
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
      const val = formatComputedValue(f.facts);
      lines.push(
        `| ${row.rule.title[lang]} | v${row.rule.version} | ${row.rule.effective.from} | ${f.status} | ${val} | ${norms} | ${msg} (${disclaimer}) |`,
      );
    }
  }

  lines.push("", `---`, `*${disclaimer}*`);
  return lines.join("\n");
}
