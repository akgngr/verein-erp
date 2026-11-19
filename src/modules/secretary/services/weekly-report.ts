/**
 * S5.1 (#315) — haftalık kurul raporu: yalnız TOPLAM/sayısal veriler. Kişi adı, başlık, tutar ayrıntısı,
 * adres veya serbest metin yoktur. Saf fonksiyonlar (test edilebilir); PDF üretimi Files hattındadır.
 */
import type { Briefing } from "@/shared/secretary/define";

export type WeeklyReportRow = { module: string; total: number; warning: number; danger: number };
export type WeeklyReport = { weekStart: string; weekEnd: string; rows: WeeklyReportRow[]; total: number; warning: number; danger: number; unavailable: number };

const MODULE_KEY = /^[a-z][a-z0-9-]{0,39}$/;
const count = (value: unknown) => (typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0);

/** Berlin haftası (Pazartesi–Pazar) "YYYY-MM-DD" aralığı. */
export function berlinWeek(today: string): { weekStart: string; weekEnd: string } {
  const date = new Date(`${today}T12:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7; // Pazartesi = 0
  const start = new Date(date.getTime() - weekday * 86_400_000);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return { weekStart: start.toISOString().slice(0, 10), weekEnd: end.toISOString().slice(0, 10) };
}

/** Özetten (zaten kullanıcının yetkisiyle süzülmüş) yalnız sayılar. Öğe başlığı/detayı kullanılmaz. */
export function buildWeeklyReport(briefing: Briefing, today: string): WeeklyReport {
  const rows = briefing.sections
    .filter((section) => MODULE_KEY.test(section.module))
    .map((section) => ({
      module: section.module,
      total: section.items.reduce((sum, item) => sum + Math.max(1, count(item.count)), 0),
      warning: section.items.filter((item) => item.severity === "warning").reduce((sum, item) => sum + Math.max(1, count(item.count)), 0),
      danger: section.items.filter((item) => item.severity === "danger").reduce((sum, item) => sum + Math.max(1, count(item.count)), 0),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));
  return {
    ...berlinWeek(today),
    rows,
    total: rows.reduce((sum, row) => sum + row.total, 0),
    warning: rows.reduce((sum, row) => sum + row.warning, 0),
    danger: rows.reduce((sum, row) => sum + row.danger, 0),
    unavailable: briefing.failures.length,
  };
}

const STRINGS = {
  tr: {
    title: (start: string, end: string) => `Haftalık kurul raporu ${start} – ${end}`,
    intro: "Bu rapor yalnız sayıları içerir; kişi adı veya ayrıntı yoktur. Ayrıntılar uygulamada, yetkiniz ölçüsünde görülebilir.",
    module: "Alan", total: "Toplam", warning: "Dikkat", danger: "Acil", sum: "Genel toplam",
    unavailable: (n: number) => `${n} alan bu rapor için şu an okunamadı.`,
    empty: "Bu hafta için bekleyen kayıt yok.",
    createdAt: "Oluşturulma", note: "Sekreter tarafından otomatik oluşturuldu.", footerTemplate: "Sayfa {page} / {total}",
  },
  de: {
    title: (start: string, end: string) => `Wochenbericht für den Vorstand ${start} – ${end}`,
    intro: "Dieser Bericht enthält nur Zahlen; keine Namen oder Einzelheiten. Details sind in der Anwendung im Rahmen Ihrer Berechtigung sichtbar.",
    module: "Bereich", total: "Gesamt", warning: "Achtung", danger: "Dringend", sum: "Summe",
    unavailable: (n: number) => `${n} Bereich(e) konnten für diesen Bericht nicht gelesen werden.`,
    empty: "Für diese Woche liegen keine offenen Einträge vor.",
    createdAt: "Erstellt", note: "Automatisch vom Sekretär erstellt.", footerTemplate: "Seite {page} / {total}",
  },
} as const;

export function weeklyReportStrings(locale: "tr" | "de") {
  const s = STRINGS[locale];
  return { createdAt: s.createdAt, note: s.note, footerTemplate: s.footerTemplate };
}

/** Markdown (PDF biçimine girdi). Modül etiketi çağırandan gelir; yoksa anahtar. Hücreler kaçışlı. */
export function renderWeeklyReportMarkdown(report: WeeklyReport, locale: "tr" | "de", moduleLabel: (key: string) => string = (key) => key): { title: string; markdown: string } {
  const s = STRINGS[locale];
  const cell = (value: string) => value.replace(/[|\\`*_#<>[\]\r\n]/g, " ").trim().slice(0, 60);
  const lines = [s.intro, ""];
  if (!report.rows.length) lines.push(s.empty);
  else {
    lines.push(`| ${s.module} | ${s.total} | ${s.warning} | ${s.danger} |`, "|---|---:|---:|---:|");
    for (const row of report.rows) lines.push(`| ${cell(moduleLabel(row.module))} | ${row.total} | ${row.warning} | ${row.danger} |`);
    lines.push(`| **${s.sum}** | **${report.total}** | **${report.warning}** | **${report.danger}** |`);
  }
  if (report.unavailable) lines.push("", s.unavailable(report.unavailable));
  return { title: s.title(report.weekStart, report.weekEnd), markdown: lines.join("\n") };
}
