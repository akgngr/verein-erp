/**
 * Öğretmen hakedişi hesaplaması (saf, test edilebilir). Saat ücreti: dakika × ücret / 60
 * (cent'e yuvarlanır); ders başı ücret: ders sayısı × ücret. Saati girilmemiş derste
 * varsayılan süre kullanılır.
 */
export type PayoutSession = { id: string; date: string; startTime: string | null; endTime: string | null; courseCode: string; courseTitle: string };
export type PayoutLine = { sessionId: string; date: string; courseCode: string; courseTitle: string; minutes: number; amountCents: number };

export function sessionMinutes(session: Pick<PayoutSession, "startTime" | "endTime">, defaultMinutes: number): number {
  const parse = (value: string | null) => {
    const match = value?.match(/^(\d{1,2}):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const start = parse(session.startTime);
  const end = parse(session.endTime);
  if (start === null || end === null || end <= start) return defaultMinutes;
  return end - start;
}

export function calculatePayout(
  sessions: PayoutSession[],
  rate: { rateCents: number; rateUnit: "HOUR" | "SESSION" },
  defaultMinutes: number,
): { lines: PayoutLine[]; minutes: number; amountCents: number } {
  const lines = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""))
    .map((session) => {
      const minutes = sessionMinutes(session, defaultMinutes);
      const amountCents = rate.rateUnit === "SESSION" ? rate.rateCents : Math.round((rate.rateCents * minutes) / 60);
      return { sessionId: session.id, date: session.date, courseCode: session.courseCode, courseTitle: session.courseTitle, minutes, amountCents };
    });
  return {
    lines,
    minutes: lines.reduce((sum, line) => sum + line.minutes, 0),
    amountCents: lines.reduce((sum, line) => sum + line.amountCents, 0),
  };
}

/** "2026-10" → [2026-10-01, 2026-11-01) (UTC). */
export function periodRange(period: string): { from: Date; to: Date } {
  const [year, month] = period.split("-").map(Number);
  return { from: new Date(Date.UTC(year, month - 1, 1)), to: new Date(Date.UTC(year, month, 1)) };
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

/** Yıllık vergiden muaf sınır (Übungsleiter/Ehrenamt) aşılıyor mu? Honorarda sınır yoktur. */
export function exceedsLimit(compensation: string, yearTotalCents: number, limits: { uebungsleiterLimitCents: number; ehrenamtLimitCents: number }): boolean {
  if (compensation === "UEBUNGSLEITER") return yearTotalCents > limits.uebungsleiterLimitCents;
  if (compensation === "EHRENAMT") return yearTotalCents > limits.ehrenamtLimitCents;
  return false;
}
