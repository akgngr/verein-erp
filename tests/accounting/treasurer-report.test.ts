import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeTreasurerReport,
  type AccountBalanceInput,
  type BookingRowInput,
  type ProjectRowInput,
  type RecordedReserveInput,
} from "@/modules/accounting/services/treasurer-report";

test("computeTreasurerReport: faaliyet alanları ve toplam gelir/gider hesaplaması", () => {
  const bookings: BookingRowInput[] = [
    { id: "b1", year: 2026, type: "INCOME", amountCents: 100_000, sphere: "IDEELL", projectId: null },
    { id: "b2", year: 2026, type: "EXPENSE", amountCents: 30_000, sphere: "IDEELL", projectId: null },
    { id: "b3", year: 2026, type: "INCOME", amountCents: 50_000, sphere: "PURPOSE_OPERATION", projectId: "p1", projectName: "Gençlik Kampı" },
    { id: "b4", year: 2026, type: "EXPENSE", amountCents: 20_000, sphere: "PURPOSE_OPERATION", projectId: "p1", projectName: "Gençlik Kampı" },
    { id: "b5", year: 2026, type: "TRANSFER", amountCents: 15_000, sphere: null, projectId: null }, // virman hesaba katılmamalı
  ];

  const prevBookings: BookingRowInput[] = [
    { id: "pb1", year: 2025, type: "INCOME", amountCents: 80_000, sphere: "IDEELL", projectId: null },
    { id: "pb2", year: 2025, type: "EXPENSE", amountCents: 40_000, sphere: "IDEELL", projectId: null },
  ];

  const accounts: AccountBalanceInput[] = [
    { id: "a1", name: "Banka", openingCents: 200_000, closingCents: 300_000 },
  ];

  const projects: ProjectRowInput[] = [{ id: "p1", name: "Gençlik Kampı" }];

  const report = computeTreasurerReport({
    year: 2026,
    bookings,
    previousYearBookings: prevBookings,
    accounts,
    projects,
  });

  // Toplamlar
  assert.equal(report.totals.totalIncomeCents, 150_000); // 100k + 50k
  assert.equal(report.totals.totalExpenseCents, 50_000);  // 30k + 20k
  assert.equal(report.totals.netAnnualSurplusCents, 100_000);

  // Önceki yıl fazlalığı
  assert.equal(report.totals.previousYearSurplusCents, 40_000); // 80k - 40k
  assert.equal(report.totals.yearOnYearDeltaCents, 60_000);     // 100k - 40k

  // Toplam gelir ve gider yıllık değişim yüzdeleri
  // Gelir: (150k - 80k) / 80k = +88% (rounded)
  assert.equal(report.totals.incomeChangePercent, 88);
  // Gider: (50k - 40k) / 40k = +25%
  assert.equal(report.totals.expenseChangePercent, 25);

  // İdeel alan
  const ideell = report.spheres.find((s) => s.sphere === "IDEELL");
  assert.ok(ideell);
  assert.equal(ideell.incomeCents, 100_000);
  assert.equal(ideell.expenseCents, 30_000);
  assert.equal(ideell.netCents, 70_000);
  assert.equal(ideell.previousYearNetCents, 40_000);
  // Değişim: (70k - 40k) / 40k = +75%
  assert.equal(ideell.yearOnYearChangePercent, 75);

  // Proje toplamı
  assert.equal(report.projects.length, 1);
  assert.equal(report.projects[0].projectName, "Gençlik Kampı");
  assert.equal(report.projects[0].incomeCents, 50_000);
  assert.equal(report.projects[0].expenseCents, 20_000);
  assert.equal(report.projects[0].netCents, 30_000);

  // Rezervler
  assert.equal(report.reserves.earmarkedFundsCents, 30_000); // p1 projesinden kalan artı bakiye
  assert.equal(report.reserves.closingReservesCents, 300_000);
  assert.equal(report.reserves.freeReservesCents, 270_000); // 300k - 30k
});

test("computeTreasurerReport: § 62 AO kayıtlı yedekler ve amaca tahsisli fonlar", () => {
  const accounts: AccountBalanceInput[] = [
    { id: "a1", name: "Ana Hesap", openingCents: 150_000, closingCents: 250_000 },
  ];

  const recordedReserves: RecordedReserveInput[] = [
    {
      id: "res1",
      year: 2026,
      kind: "FREE",
      amountCents: 50_000,
      purpose: "§ 62 Abs. 1 Nr. 3 AO Serbest Yedek",
      plannedUseYear: null,
    },
    {
      id: "res2",
      year: 2026,
      kind: "PURPOSE",
      amountCents: 40_000,
      purpose: "Gençlik Binası Yenileme",
      plannedUseYear: 2027,
    },
  ];

  const report = computeTreasurerReport({
    year: 2026,
    bookings: [],
    previousYearBookings: [],
    accounts,
    projects: [],
    recordedReserves,
  });

  assert.equal(report.reserves.totalRecordedReservesCents, 90_000);
  assert.equal(report.reserves.recordedReserves.length, 2);
  assert.equal(report.reserves.closingReservesCents, 250_000);

  // Düz metinde § 62 AO açıklaması yer almalı
  const trText = report.plainSummary.tr.join(" ");
  const deText = report.plainSummary.de.join(" ");
  assert.match(trText, /§ 62 AO/);
  assert.match(deText, /§ 62 AO/);
});

test("computeTreasurerReport: Önceki yıl bazının 0 olması durumu (sıfıra bölme koruması)", () => {
  const bookings: BookingRowInput[] = [
    { id: "b1", year: 2026, type: "INCOME", amountCents: 50_000, sphere: "ECONOMIC_OPERATION", projectId: null },
  ];

  const report = computeTreasurerReport({
    year: 2026,
    bookings,
    previousYearBookings: [], // Önceki yıl fişi yok
    accounts: [{ id: "acc1", name: "Kasa", openingCents: 0, closingCents: 50_000 }],
    projects: [],
  });

  // Önceki yıl 0 iken NaN değil null olmalı
  assert.equal(report.totals.incomeChangePercent, null);
  assert.equal(report.totals.expenseChangePercent, null);
  const eco = report.spheres.find((s) => s.sphere === "ECONOMIC_OPERATION");
  assert.ok(eco);
  assert.equal(eco.yearOnYearChangePercent, null);
});

test("computeTreasurerReport: İbra tavsiyesi (Entlastung) üretimi", () => {
  const report = computeTreasurerReport({
    year: 2026,
    bookings: [],
    previousYearBookings: [],
    accounts: [{ id: "acc1", name: "Kasa", openingCents: 10_000, closingCents: 10_000 }],
    projects: [],
  });

  assert.ok(report.plainSummary.recommendation);
  assert.match(report.plainSummary.recommendation.tr, /Sayman ve Yönetim Kurulu'nun ibrası tavsiye edilir/);
  assert.match(report.plainSummary.recommendation.de, /Entlastung des Schatzmeisters und des Vorstands empfohlen/);
});

test("computeTreasurerReport: Gizlilik doğrulaması (kişisel veya üye verisi içermez)", () => {
  const bookings: BookingRowInput[] = [
    { id: "b1", year: 2026, type: "INCOME", amountCents: 12_000, sphere: "IDEELL", projectId: null },
  ];

  const report = computeTreasurerReport({
    year: 2026,
    bookings,
    previousYearBookings: [],
    accounts: [{ id: "acc1", name: "Sparkasse", openingCents: 10_000, closingCents: 22_000 }],
    projects: [],
  });

  const serialized = JSON.stringify(report);

  // Çıktıda kişi adları veya IBAN formatı bulunmamalıdır
  assert.doesNotMatch(serialized, /DE\d{20}/);
  assert.doesNotMatch(serialized, /Max Mustermann/i);
  assert.doesNotMatch(serialized, /Ahmet Yılmaz/i);

  // Düz metin özetleri üretilmiş olmalı
  assert.ok(report.plainSummary.tr.length > 0);
  assert.ok(report.plainSummary.de.length > 0);
  assert.match(report.plainSummary.tr[0], /2026 faaliyet döneminde/);
  assert.match(report.plainSummary.de[0], /Im Geschäftsjahr 2026/);
});
