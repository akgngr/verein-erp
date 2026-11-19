/** PII-minimized email summary: counts and a trusted application URL only. */
export type DailySummaryInput = {
  date: string;
  total: number;
  danger: number;
  warning: number;
};

export type DailySummaryEmail = { subject: string; text: string; html: string };

function safeCount(value: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderSecretaryDailySummary(
  digest: DailySummaryInput,
  locale: "tr" | "de",
  applicationOrigin: string,
): DailySummaryEmail {
  // Base URL is provided only by server-side trusted config, never by a request parameter.
  const origin = new URL(applicationOrigin);
  if (!["https:", "http:"].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash) {
    throw new Error("SECRETARY_INVALID_ORIGIN");
  }
  if (origin.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(origin.hostname)) {
    throw new Error("SECRETARY_ORIGIN_REQUIRES_HTTPS");
  }
  const date = /^\d{4}-\d{2}-\d{2}$/.test(digest.date) ? digest.date : "";
  if (!date) throw new Error("SECRETARY_INVALID_DATE");
  const url = new URL("/sekreter", origin).toString();
  const total = safeCount(digest.total);
  const danger = safeCount(digest.danger);
  const warning = safeCount(digest.warning);
  const tr = locale === "tr";
  const subject = tr ? `Günlük özet · ${date}` : `Tagesübersicht · ${date}`;
  const lines = tr
    ? [`Tarih: ${date}`, `Toplam: ${total}`, `Acil: ${danger}`, `Dikkat: ${warning}`, `Özetinize gidin: ${url}`]
    : [`Datum: ${date}`, `Gesamt: ${total}`, `Dringend: ${danger}`, `Hinweise: ${warning}`, `Zur Übersicht: ${url}`];
  return {
    subject,
    text: lines.join("\n"),
    html: `<p>${esc(subject)}</p><ul>${lines.slice(0, 4).map((line) => `<li>${esc(line)}</li>`).join("")}</ul><p><a href="${esc(url)}">${tr ? "Özetinize gidin" : "Zur Übersicht"}</a></p>`,
  };
}
