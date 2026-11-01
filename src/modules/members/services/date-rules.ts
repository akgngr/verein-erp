/**
 * Üyelik tarih kuralları (saf fonksiyonlar; sunucu eylemleri ve testler kullanır).
 * Dönen değerler alan → çeviri anahtarı listesidir (createAction fieldErrors biçimi).
 *
 *  - Doğum tarihi: bugünden sonra olamaz, 1900'den önce olamaz.
 *  - Giriş tarihi: doğum tarihinden önce olamaz; en fazla 1 yıl sonrası (ör. "1 Ocak'tan itibaren üye").
 *  - Ayrılış tarihi: giriş tarihinden önce olamaz.
 *  - Ödeme tarihi: üyenin giriş tarihinden önce ve bugünden sonra olamaz.
 *  - Aidat yılı: üyelik yılları içinde olmalı (giriş yılı … ayrılış yılı ya da gelecek yıl).
 */
export type DateProblems = Record<string, string[]>;

const DAY = 86_400_000;
export const EARLIEST_DATE = new Date(Date.UTC(1900, 0, 1));

const add = (problems: DateProblems, field: string, key: string) => {
  (problems[field] ??= []).push(key);
};

export function checkMemberDates(args: { birthDate: Date | null; joinDate: Date; exitDate: Date | null; today: Date }): DateProblems {
  const problems: DateProblems = {};
  const { birthDate, joinDate, exitDate, today } = args;
  if (birthDate) {
    if (birthDate.getTime() > today.getTime()) add(problems, "birthDate", "members.validation.birthDateFuture");
    if (birthDate.getTime() < EARLIEST_DATE.getTime()) add(problems, "birthDate", "members.validation.dateTooOld");
  }
  if (joinDate.getTime() < EARLIEST_DATE.getTime()) add(problems, "joinDate", "members.validation.dateTooOld");
  if (birthDate && joinDate.getTime() < birthDate.getTime()) add(problems, "joinDate", "members.validation.joinBeforeBirth");
  if (joinDate.getTime() > today.getTime() + 366 * DAY) add(problems, "joinDate", "members.validation.joinTooFarFuture");
  if (exitDate && exitDate.getTime() < joinDate.getTime()) add(problems, "exitDate", "members.validation.exitBeforeJoin");
  return problems;
}

export function checkPaymentDate(args: { paidAt: Date; joinDate: Date; today: Date }): DateProblems {
  const problems: DateProblems = {};
  if (args.paidAt.getTime() > args.today.getTime()) add(problems, "paidAt", "members.validation.paymentDateFuture");
  if (args.paidAt.getTime() < args.joinDate.getTime()) add(problems, "paidAt", "members.validation.paymentBeforeJoin");
  return problems;
}

/** Üyeliğin kapsadığı aidat yılları (dahil). */
export function dueYearRange(args: { joinDate: Date; exitDate: Date | null; today: Date }): { min: number; max: number } {
  const min = args.joinDate.getUTCFullYear();
  const max = args.exitDate ? args.exitDate.getUTCFullYear() : Math.max(min, args.today.getUTCFullYear() + 1);
  return { min, max };
}

export function checkDueYear(args: { year: number; joinDate: Date; exitDate: Date | null; today: Date }, field = "dueYear"): DateProblems {
  const { min, max } = dueYearRange(args);
  return args.year < min || args.year > max ? { [field]: ["members.validation.dueYearOutsideMembership"] } : {};
}

export const hasProblems = (problems: DateProblems) => Object.keys(problems).length > 0;

/** Tarihi YYYY-MM-DD olarak (tarih seçicinin min/max değeri için). */
export const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);
