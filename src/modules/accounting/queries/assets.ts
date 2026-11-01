import "server-only";

import { getDb } from "@/shared/db";

import { depreciationForYear, flatRateYearTotals, type AssetMethod, type FlatRateKind } from "../services/afa";
import type { EuerAdjustments } from "../services/tax-reports";

const asAsset = (row: { costCents: number; acquisitionDate: Date; usefulLifeMonths: number; method: string; disposalDate: Date | null }) => ({
  costCents: row.costCents,
  acquisitionDate: row.acquisitionDate,
  usefulLifeMonths: row.usefulLifeMonths,
  method: (["LINEAR", "GWG", "POOL"].includes(row.method) ? row.method : "LINEAR") as AssetMethod,
  disposalDate: row.disposalDate,
});

export type AssetRow = { id: string; name: string; acquisitionDate: Date; costCents: number; usefulLifeMonths: number; method: AssetMethod; disposalDate: Date | null; notes: string | null; afaCents: number; bookValueEndCents: number };

/** Anlagenverzeichnis: yıl için AfA ve yıl sonu defter değeri. */
export async function listAssets(year: number): Promise<AssetRow[]> {
  const rows = await getDb().accountingAsset.findMany({ where: { acquisitionDate: { lte: new Date(Date.UTC(year, 11, 31)) } }, orderBy: { acquisitionDate: "asc" } });
  return rows.map((row) => {
    const asset = asAsset(row);
    const { amountCents, bookValueEndCents } = depreciationForYear(asset, year);
    return { id: row.id, name: row.name, acquisitionDate: row.acquisitionDate, costCents: row.costCents, usefulLifeMonths: row.usefulLifeMonths, method: asset.method, disposalDate: row.disposalDate, notes: row.notes, afaCents: amountCents, bookValueEndCents };
  });
}

export async function listFlatRates(year: number) {
  return getDb().accountingFlatRate.findMany({ where: { date: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) } }, orderBy: { date: "asc" } });
}

/** EÜR düzeltmeleri: Anlagegut kategorileri hariç, AfA + götürüler (tavanlı) eklenir. */
export async function getEuerAdjustments(year: number): Promise<EuerAdjustments> {
  const db = getDb();
  const [categories, assets, flats] = await Promise.all([db.accountingCategory.findMany({ where: { isAsset: true }, select: { id: true } }), listAssets(year), listFlatRates(year)]);
  const totals = flatRateYearTotals(flats.map((flat) => ({ kind: flat.kind as FlatRateKind, amountCents: flat.amountCents })));
  return {
    assetCategoryIds: new Set(categories.map((category) => category.id)),
    nonCash: [{ key: "afa", cents: assets.reduce((sum, asset) => sum + asset.afaCents, 0) }, ...(Object.keys(totals) as FlatRateKind[]).map((kind) => ({ key: `flat_${kind}`, cents: totals[kind].cappedCents }))],
  };
}

/** § 62 AO: yedekler + serbest yedek üst sınırı (Vermögensverwaltung fazlası ve diğer fonlar). */
export async function getReserveOverview(year: number) {
  const db = getDb();
  const [reserves, bookings] = await Promise.all([
    db.accountingReserve.findMany({ orderBy: [{ year: "desc" }, { createdAt: "asc" }] }),
    db.accountingBooking.findMany({ where: { year, reversedAt: null, type: { not: "TRANSFER" } }, select: { type: true, amount: true, category: { select: { sphere: true } } } }),
  ]);
  const sum = (filter: (row: (typeof bookings)[number]) => boolean, type: "INCOME" | "EXPENSE") =>
    bookings.filter((row) => row.type === type && filter(row)).reduce((total, row) => total + Math.round(Number(row.amount) * 100), 0);
  const isAsset = (row: (typeof bookings)[number]) => row.category?.sphere === "ASSET_MANAGEMENT";
  const notEconomic = (row: (typeof bookings)[number]) => row.category?.sphere !== "ECONOMIC_OPERATION" && !isAsset(row);
  const assetManagementSurplusCents = sum(isAsset, "INCOME") - sum(isAsset, "EXPENSE");
  const otherFundsCents = sum(notEconomic, "INCOME") - sum(notEconomic, "EXPENSE");
  return { reserves, assetManagementSurplusCents, otherFundsCents };
}
