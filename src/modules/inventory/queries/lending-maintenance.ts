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

export async function getInventoryOperationsData(): Promise<InventoryOperationsData> {
  const db = getDb();
  const [items, loans, maintenances] = await Promise.all([
    db.inventoryItem.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        category: true,
        serialNumber: true,
        nextInspectionAt: true,
      },
      orderBy: [{ name: "asc" }],
      take: 500,
    }),
    db.inventoryLoan.findMany({
      where: { item: { deletedAt: null } },
      include: { item: { select: { name: true } } },
      orderBy: [{ returnedAt: "asc" }, { lentAt: "desc" }],
      take: 200,
    }),
    db.inventoryMaintenance.findMany({
      where: { item: { deletedAt: null } },
      include: { item: { select: { name: true } } },
      orderBy: [{ performedAt: "desc" }],
      take: 200,
    }),
  ]);

  const now = new Date();
  const inspections: InventoryInspectionSummaryRow[] = items
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      serialNumber: item.serialNumber,
      nextInspectionAt: day(item.nextInspectionAt),
      inspectionStatus: classifyInspectionStatus(item.nextInspectionAt, now),
    }))
    .filter((row) => row.inspectionStatus !== "none")
    .sort((a, b) => (a.nextInspectionAt ?? "").localeCompare(b.nextInspectionAt ?? ""));

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
