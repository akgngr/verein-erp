/**
 * #605: Upcoming birthdays and membership anniversaries (pure; no DB). Dates are calendar days stored as UTC
 * midnight (`@db.Date`); `today` must be the Berlin calendar day as UTC midnight (see `berlinToday`).
 */
export const ANNIVERSARY_YEARS = [10, 25, 40, 50, 60] as const;
export const CELEBRATION_WINDOW_DAYS = 30;

export type CelebrationMember = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
  birthDate: Date | null;
  joinDate: Date;
};

export type Celebration = {
  memberId: string;
  name: string;
  membershipNumber: string;
  kind: "birthday" | "anniversary";
  /** Next occurrence (UTC midnight). */
  date: Date;
  /** Age turned (birthday) or membership years completed (anniversary). */
  years: number;
  daysUntil: number;
};

const DAY_MS = 86_400_000;

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Occurrence of month/day in `year`; 29 February falls on 28 February in non-leap years. */
function occurrenceIn(year: number, source: Date): Date {
  const month = source.getUTCMonth();
  const day = month === 1 && source.getUTCDate() === 29 && !isLeapYear(year) ? 28 : source.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

function nextOccurrence(source: Date, today: Date): Date {
  const thisYear = occurrenceIn(today.getUTCFullYear(), source);
  return thisYear.getTime() >= today.getTime() ? thisYear : occurrenceIn(today.getUTCFullYear() + 1, source);
}

export function upcomingCelebrations(
  members: CelebrationMember[],
  today: Date,
  windowDays: number = CELEBRATION_WINDOW_DAYS,
  anniversaryYears: readonly number[] = ANNIVERSARY_YEARS,
): Celebration[] {
  const result: Celebration[] = [];
  for (const member of members) {
    const name = `${member.firstName} ${member.lastName}`.trim();
    if (member.birthDate && member.birthDate.getTime() < today.getTime()) {
      const date = nextOccurrence(member.birthDate, today);
      const daysUntil = Math.round((date.getTime() - today.getTime()) / DAY_MS);
      if (daysUntil <= windowDays) {
        result.push({ memberId: member.id, name, membershipNumber: member.membershipNumber, kind: "birthday", date, years: date.getUTCFullYear() - member.birthDate.getUTCFullYear(), daysUntil });
      }
    }
    if (member.joinDate.getTime() < today.getTime()) {
      const date = nextOccurrence(member.joinDate, today);
      const years = date.getUTCFullYear() - member.joinDate.getUTCFullYear();
      const daysUntil = Math.round((date.getTime() - today.getTime()) / DAY_MS);
      if (daysUntil <= windowDays && anniversaryYears.includes(years)) {
        result.push({ memberId: member.id, name, membershipNumber: member.membershipNumber, kind: "anniversary", date, years, daysUntil });
      }
    }
  }
  return result.sort((a, b) => a.daysUntil - b.daysUntil || a.name.localeCompare(b.name, "de"));
}
