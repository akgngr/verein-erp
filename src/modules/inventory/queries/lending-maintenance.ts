import "server-only";

import { getDb } from "@/shared/db";

import { classifyInspectionStatus, type InspectionStatus } from "../helpers/maintenance";

export type InventoryLoanRow = {
  id: string;
  itemId: string;
  itemName: string;
  borrowerName: string;
  lentAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  note: string | null;
};

export type InventoryMaintenanceRow = {
  id: string;
  itemId: string;
  itemName: string;
  kind: string;
  performedAt: string;
  nextDueAt: string | null;
  inspector: string | null;
  passed: boolean;
  note: string | null;
};

export type InventoryInspectionSummaryRow = {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  nextInspectionAt: string | null;
  inspectionStatus: InspectionStatus;
};

export type InventoryOperationsData = {
  items: { id: string; name: string }[];
  loans: InventoryLoanRow[];
  maintenances: InventoryMaintenanceRow[];
  inspections: InventoryInspectionSummaryRow[];
};

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/** Returned loans shown as history (newest first); open loans are always listed in full. */
export const RETURNED_LOANS_SHOWN = 200;
/** Days ahead an inspection counts as due soon (same as classifyInspectionStatus). */
const INSPECTION_SOON_DAYS = 30;

export async function getInventoryOperationsData(now: Date = new Date()): Promise<InventoryOperationsData> {
  const db = getDb();
  const horizon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + INSPECTION_SOON_DAYS));
  const loanInclude = { item: { select: { name: true } } } as const;
  const [items, due, openLoans, returnedLoans, maintenances] = await Promise.all([
    // Selector options: every active item (id and name only), so none becomes unreachable.
    db.inventoryItem.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    }),
    // The schedule asks the database for due and overdue inspections directly, by date.
    db.inventoryItem.findMany({
      where: { deletedAt: null, nextInspectionAt: { not: null, lte: horizon } },
      select: { id: true, name: true, category: true, serialNumber: true, nextInspectionAt: true },
      orderBy: [{ nextInspectionAt: "asc" }, { name: "asc" }],
    }),
    // Open loans first and without a limit: they carry the "returned" action.
    db.inventoryLoan.findMany({
      where: { item: { deletedAt: null }, returnedAt: null },
      include: loanInclude,
      orderBy: [{ lentAt: "desc" }],
    }),
    db.inventoryLoan.findMany({
      where: { item: { deletedAt: null }, returnedAt: { not: null } },
      include: loanInclude,
      orderBy: [{ returnedAt: "desc" }, { lentAt: "desc" }],
      take: RETURNED_LOANS_SHOWN,
    }),
    db.inventoryMaintenance.findMany({
      where: { item: { deletedAt: null } },
      include: { item: { select: { name: true } } },
      orderBy: [{ performedAt: "desc" }],
      take: 200,
    }),
  ]);
  const loans = [...openLoans, ...returnedLoans];

  const inspections: InventoryInspectionSummaryRow[] = due
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      serialNumber: item.serialNumber,
      nextInspectionAt: day(item.nextInspectionAt),
      inspectionStatus: classifyInspectionStatus(item.nextInspectionAt, now),
    }))
    .filter((row) => row.inspectionStatus !== "none");

  return {
    items: items.map((i) => ({ id: i.id, name: i.name })),
    loans: loans.map((l) => ({
      id: l.id,
      itemId: l.itemId,
      itemName: l.item.name,
      borrowerName: l.borrowerName,
      lentAt: day(l.lentAt)!,
      dueAt: day(l.dueAt),
      returnedAt: day(l.returnedAt),
      note: l.note,
    })),
    maintenances: maintenances.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      itemName: m.item.name,
      kind: m.kind,
      performedAt: day(m.performedAt)!,
      nextDueAt: day(m.nextDueAt),
      inspector: m.inspector,
      passed: m.passed,
      note: m.note,
    })),
    inspections,
  };
}
