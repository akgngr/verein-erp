import { unstable_rethrow } from "next/navigation"

import { ForbiddenError, UnauthorizedError } from "@/modules/auth/server"
import { translateMessage } from "@/shared/i18n/translate-message"

import { buildEventsWorkbook } from "../../services/event-export-service"

/** GET /api/events/export — etkinlik listesi (.xlsx), arayüz dilinde. */
export async function GET(): Promise<Response> {
  try {
    const file = await buildEventsWorkbook()
    return new Response(file.buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    unstable_rethrow(error)
    if (error instanceof UnauthorizedError) {
      return Response.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 })
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 })
    }
    console.error("[events] export failed:", error instanceof Error ? error.message : String(error))
    return Response.json({ ok: false, error: await translateMessage("common.errors.unexpected") }, { status: 500 })
  }
}
