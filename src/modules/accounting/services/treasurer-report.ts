import type { Sphere } from "@prisma/client";

import { SPHERE_ORDER } from "../constants";

export interface BookingRowInput {
  id: string;
  year: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amountCents: number;
  sphere: Sphere | null;
  projectId: string | null;
  projectName?: string | null;
}

export interface AccountBalanceInput {
  id: string;
  name: string;
  openingCents: number;
  closingCents: number;
}

export interface ProjectRowInput {
  id: string;
  name: string;
}

export interface RecordedReserveInput {
  id: string;
  year: number;
  kind: string; // FREE | PURPOSE | REPLACEMENT | OPERATING
  amountCents: number;
  purpose: string;
  plannedUseYear: number | null;
}

export interface SphereAggregate {
  sphere: Sphere;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  previousYearNetCents: number;
  yearOnYearChangePercent: number | null;
}

export interface ProjectAggregate {
  projectId: string;
  projectName: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

export interface ReservesAggregate {
  openingReservesCents: number;
  closingReservesCents: number;
  annualSurplusCents: number;
  earmarkedFundsCents: number;
  freeReservesCents: number;
  recordedReserves: RecordedReserveInput[];
  totalRecordedReservesCents: number;
}

export interface TreasurerReportResult {
  year: number;
  spheres: SphereAggregate[];
  projects: ProjectAggregate[];
  reserves: ReservesAggregate;
  totals: {
    totalIncomeCents: number;
    totalExpenseCents: number;
    netAnnualSurplusCents: number;
    previousYearSurplusCents: number;
    yearOnYearDeltaCents: number;
    incomeChangePercent: number | null;
    expenseChangePercent: number | null;
  };
  plainSummary: {
    tr: string[];
    de: string[];
    recommendation: {
      tr: string;
      de: string;
    };
  };
}

/**
 * Genel Kurul Kassenbericht hesaplama servisi (Q3).
 * Saf fonksiyon: veri tabanı bağımsız, sentetik verilerle test edilebilir.
 * Yalnızca toplulaştırılmış (aggregate) tutarlar üretir; şahıs veya üye adı barındırmaz.
 */
export function computeTreasurerReport(params: {
  year: number;
  bookings: BookingRowInput[];
  previousYearBookings: BookingRowInput[];
  accounts: AccountBalanceInput[];
  projects: ProjectRowInput[];
  recordedReserves?: RecordedReserveInput[];
}): TreasurerReportResult {
  const { year, bookings, previousYearBookings, accounts, projects, recordedReserves = [] } = params;

  // 1. Faaliyet alanları (Spheres) toplamları
  const currentSphereMap = new Map<Sphere, { income: number; expense: number }>();
  const prevSphereMap = new Map<Sphere, { income: number; expense: number }>();

  for (const sphere of SPHERE_ORDER) {
    currentSphereMap.set(sphere, { income: 0, expense: 0 });
    prevSphereMap.set(sphere, { income: 0, expense: 0 });
  }

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  for (const b of bookings) {
    if (b.type === "TRANSFER") continue;
    if (b.type === "INCOME") totalIncomeCents += b.amountCents;
    if (b.type === "EXPENSE") totalExpenseCents += b.amountCents;

    if (b.sphere && currentSphereMap.has(b.sphere)) {
      const entry = currentSphereMap.get(b.sphere)!;
      if (b.type === "INCOME") entry.income += b.amountCents;
      if (b.type === "EXPENSE") entry.expense += b.amountCents;
    }
  }

  let prevTotalIncomeCents = 0;
  let prevTotalExpenseCents = 0;

  for (const b of previousYearBookings) {
    if (b.type === "TRANSFER") continue;
    if (b.type === "INCOME") prevTotalIncomeCents += b.amountCents;
    if (b.type === "EXPENSE") prevTotalExpenseCents += b.amountCents;

    if (b.sphere && prevSphereMap.has(b.sphere)) {
      const entry = prevSphereMap.get(b.sphere)!;
      if (b.type === "INCOME") entry.income += b.amountCents;
      if (b.type === "EXPENSE") entry.expense += b.amountCents;
    }
  }

  const spheres: SphereAggregate[] = SPHERE_ORDER.map((sphere) => {
    const cur = currentSphereMap.get(sphere) ?? { income: 0, expense: 0 };
    const prev = prevSphereMap.get(sphere) ?? { income: 0, expense: 0 };
    const net = cur.income - cur.expense;
    const prevNet = prev.income - prev.expense;

    let yearOnYearChangePercent: number | null = null;
    if (prevNet !== 0) {
      yearOnYearChangePercent = Math.round(((net - prevNet) / Math.abs(prevNet)) * 100);
    }

    return {
      sphere,
      incomeCents: cur.income,
      expenseCents: cur.expense,
      netCents: net,
      previousYearNetCents: prevNet,
      yearOnYearChangePercent,
    };
  });

  // 2. Proje bazlı toplamlar
  const projectMap = new Map<string, { name: string; income: number; expense: number }>();
  for (const p of projects) {
    projectMap.set(p.id, { name: p.name, income: 0, expense: 0 });
  }

  for (const b of bookings) {
    if (b.type === "TRANSFER" || !b.projectId) continue;
    const entry = projectMap.get(b.projectId) ?? {
      name: b.projectName ?? "Bilinmeyen Proje",
      income: 0,
      expense: 0,
    };
    if (b.type === "INCOME") entry.income += b.amountCents;
    if (b.type === "EXPENSE") entry.expense += b.amountCents;
    projectMap.set(b.projectId, entry);
  }

  const projectAggregates: ProjectAggregate[] = [...projectMap.entries()]
    .map(([projectId, entry]) => ({
      projectId,
      projectName: entry.name,
      incomeCents: entry.income,
      expenseCents: entry.expense,
      netCents: entry.income - entry.expense,
    }))
    .filter((p) => p.incomeCents > 0 || p.expenseCents > 0)
    .sort((a, b) => b.incomeCents + b.expenseCents - (a.incomeCents + a.expenseCents));

  // 3. Rezervler ve Fonlar
  const openingReservesCents = accounts.reduce((sum, a) => sum + a.openingCents, 0);
  const closingReservesCents = accounts.reduce((sum, a) => sum + a.closingCents, 0);
  const netAnnualSurplusCents = totalIncomeCents - totalExpenseCents;
  const previousYearSurplusCents = prevTotalIncomeCents - prevTotalExpenseCents;
  const yearOnYearDeltaCents = netAnnualSurplusCents - previousYearSurplusCents;

  const incomeChangePercent = prevTotalIncomeCents !== 0
    ? Math.round(((totalIncomeCents - prevTotalIncomeCents) / Math.abs(prevTotalIncomeCents)) * 100)
    : null;

  const expenseChangePercent = prevTotalExpenseCents !== 0
    ? Math.round(((totalExpenseCents - prevTotalExpenseCents) / Math.abs(prevTotalExpenseCents)) * 100)
    : null;

  // Projelerde kalan artı bakiye amaca bağlı fon (zweckgebunden) kabul edilir
  const earmarkedFundsCents = projectAggregates
    .filter((p) => p.netCents > 0)
    .reduce((sum, p) => sum + p.netCents, 0);

  const freeReservesCents = Math.max(0, closingReservesCents - earmarkedFundsCents);
  const totalRecordedReservesCents = recordedReserves.reduce((sum, r) => sum + r.amountCents, 0);

  const reserves: ReservesAggregate = {
    openingReservesCents,
    closingReservesCents,
    annualSurplusCents: netAnnualSurplusCents,
    earmarkedFundsCents,
    freeReservesCents,
    recordedReserves,
    totalRecordedReservesCents,
  };

  // 4. İki Dilli Düz Metin Özet (Plain-language Narrative)
  const formatMoney = (cents: number, lang: "tr" | "de") => {
    const euros = cents / 100;
    return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    }).format(euros);
  };

  const trSummary: string[] = [
    `${year} faaliyet döneminde derneğin toplam geliri ${formatMoney(totalIncomeCents, "tr")}, toplam gideri ${formatMoney(totalExpenseCents, "tr")} olarak gerçekleşmiştir. Dönem ${netAnnualSurplusCents >= 0 ? "net " + formatMoney(netAnnualSurplusCents, "tr") + " fazlalıkla" : "net " + formatMoney(Math.abs(netAnnualSurplusCents), "tr") + " açıkla"} tamamlanmıştır.`,
    `İdeel alandaki (üye aidatları ve bağışlar) net bakiye ${formatMoney(spheres.find((s) => s.sphere === "IDEELL")?.netCents ?? 0, "tr")} seviyesindedir.`,
    projectAggregates.length > 0
      ? `Dönem içinde ${projectAggregates.length} aktif projede faaliyet yürütülmüş, amaca bağlı fon bakiyesi ${formatMoney(earmarkedFundsCents, "tr")} olarak kaydedilmiştir.`
      : "Dönem içinde ayrı bir proje kaydı yürütülmemiştir.",
    `Kasa ve banka hesaplarındaki toplam likit rezerv yıl sonunda ${formatMoney(closingReservesCents, "tr")} seviyesine ulaşmıştır (serbest rezerv: ${formatMoney(freeReservesCents, "tr")}).`,
  ];

  if (totalRecordedReservesCents > 0) {
    trSummary.push(
      `§ 62 AO kapsamında kayıtlı toplam yedek akçe tutarı ${formatMoney(totalRecordedReservesCents, "tr")} seviyesindedir.`,
    );
  }

  const deSummary: string[] = [
    `Im Geschäftsjahr ${year} beliefen sich die Gesamteinnahmen auf ${formatMoney(totalIncomeCents, "de")} und die Gesamtausgaben auf ${formatMoney(totalExpenseCents, "de")}. Das Geschäftsjahr schließt mit einem ${netAnnualSurplusCents >= 0 ? "Jahresüberschuss von " + formatMoney(netAnnualSurplusCents, "de") : "Jahresfehlbetrag von " + formatMoney(Math.abs(netAnnualSurplusCents), "de")} ab.`,
    `Im ideellen Bereich (Mitgliedsbeiträge und Spenden) wurde ein Nettoergebnis von ${formatMoney(spheres.find((s) => s.sphere === "IDEELL")?.netCents ?? 0, "de")} erzielt.`,
    projectAggregates.length > 0
      ? `Im Berichtszeitraum wurden ${projectAggregates.length} Projekte geführt; der zweckgebundene Mittelbestand beträgt ${formatMoney(earmarkedFundsCents, "de")}.`
      : "Im Berichtszeitraum wurden keine gesonderten Projektbuchungen erfasst.",
    `Der Gesamtbestand der liquiden Mittel (Kasse und Bankkonten) belief sich zum Stichtag auf ${formatMoney(closingReservesCents, "de")} (davon freie Rücklagen: ${formatMoney(freeReservesCents, "de")}).`,
  ];

  if (totalRecordedReservesCents > 0) {
    deSummary.push(
      `Die nach § 62 AO ausgewiesenen Rücklagen belaufen sich auf insgesamt ${formatMoney(totalRecordedReservesCents, "de")}.`,
    );
  }

  const recommendation = {
    tr: `${year} yılı defter, belge ve hesap denetimleri sonucunda kasa hareketlerinin nizami olduğu tespit edilmiş olup, Genel Kurul'a Sayman ve Yönetim Kurulu'nun ibrası tavsiye edilir.`,
    de: `Die Kassenprüfung ergab eine ordnungsgemäße Buch- und Belegführung. Der Mitgliederversammlung wird die Entlastung des Schatzmeisters und des Vorstands empfohlen.`,
  };

  return {
    year,
    spheres,
    projects: projectAggregates,
    reserves,
    totals: {
      totalIncomeCents,
      totalExpenseCents,
      netAnnualSurplusCents,
      previousYearSurplusCents,
      yearOnYearDeltaCents,
      incomeChangePercent,
      expenseChangePercent,
    },
    plainSummary: {
      tr: trSummary,
      de: deSummary,
      recommendation,
    },
  };
}
