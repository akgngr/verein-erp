import "server-only";

import { getDb } from "@/shared/db";

import type { ProjectOption } from "../types";

/** Proje seçenekleri (form): aktifler. */
export async function listProjectOptions(): Promise<ProjectOption[]> {
  const rows = await getDb().accountingProject.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });
  return rows;
}

/** Ayarlar sekmesi: tüm projeler + fiş sayısı. */
export async function listAllProjects(): Promise<Array<{
  id: string;
  name: string;
  note: string | null;
  isActive: boolean;
  bookingCount: number;
}>> {
  const db = getDb();
  const rows = await db.accountingProject.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      note: true,
      isActive: true,
      _count: { select: { bookings: true } },
    },
  });
  return rows.map((row) => ({ ...row, bookingCount: row._count.bookings }));
}
