import "server-only"

import ExcelJS from "exceljs"
import { getTranslations } from "next-intl/server"

import { requirePermission } from "@/modules/auth/server"
import { getDb } from "@/shared/db"

import { eventsPermissions } from "../permissions"

export interface EventExportFile {
  buffer: ArrayBuffer
  filename: string
}

/**
 * Etkinlik listesi Excel dışa aktarımı (GET /api/events/export): events.view
 * gerektirir; başlıklar, tür/durum etiketleri ve dosya adı arayüz dilindedir.
 * Tarih hücreleri gerçek tarih (dd.mm.yyyy hh:mm) olarak yazılır.
 */
export async function buildEventsWorkbook(): Promise<EventExportFile> {
  await requirePermission(eventsPermissions, "view")
  const t = await getTranslations("events")

  const events = await getDb().event.findMany({
    orderBy: { startDate: "asc" },
    include: { attendees: { select: { status: true } } },
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(t("export.sheet"))
  sheet.columns = [
    { header: t("export.columns.title"), key: "title", width: 36 },
    { header: t("export.columns.type"), key: "type", width: 16 },
    { header: t("export.columns.status"), key: "status", width: 14 },
    { header: t("export.columns.startDate"), key: "startDate", width: 18 },
    { header: t("export.columns.endDate"), key: "endDate", width: 18 },
    { header: t("export.columns.location"), key: "location", width: 30 },
    { header: t("export.columns.capacity"), key: "capacity", width: 12 },
    { header: t("export.columns.registered"), key: "registered", width: 12 },
    { header: t("export.columns.attended"), key: "attended", width: 12 },
  ]

  const label = (namespace: "types" | "status", value: string) =>
    t.has(`${namespace}.${value}`) ? t(`${namespace}.${value}`) : value

  for (const event of events) {
    const row = sheet.addRow({
      title: event.title,
      type: label("types", event.type),
      status: label("status", event.status),
      startDate: event.startDate,
      endDate: event.endDate ?? "",
      location: event.isOnline
        ? `${t("export.online")}${event.onlineUrl ? ` (${event.onlineUrl})` : ""}`
        : (event.location ?? ""),
      capacity: event.capacity ?? t("table.unlimited"),
      registered: event.attendees.filter((attendee) => attendee.status !== "CANCELLED").length,
      attended: event.attendees.filter((attendee) => attendee.status === "ATTENDED").length,
    })
    for (const key of ["startDate", "endDate"]) {
      const cell = row.getCell(key)
      if (cell.value instanceof Date) cell.numFmt = "dd.mm.yyyy hh:mm"
    }
  }

  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: "frozen", ySplit: 1 }]
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } }

  const today = new Date().toISOString().slice(0, 10)
  return {
    buffer: (await workbook.xlsx.writeBuffer()) as ArrayBuffer,
    filename: `${t("export.file")}-${today}.xlsx`,
  }
}
