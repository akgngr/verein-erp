import "server-only";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { buildUserLabel } from "@/shared/utils";

import { ForbiddenError, requirePermission, UnauthorizedError } from "@/modules/auth/server";

import { studentsDatevPermissions } from "../permissions";
import { listGuardiansForDatev } from "../queries/guardians";
import { getStudentsSettings } from "../queries/settings";
import { buildDatevDebtorsCsv } from "./datev-export";

/** GET /api/students/datev-debitoren — DATEV Stammdaten (Debitoren) CSV, Windows-1252. */
export async function datevDebtorsHandler(): Promise<Response> {
  let user;
  try {
    user = await requirePermission(studentsDatevPermissions, "view");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
    }
    throw error;
  }
  const settings = await getStudentsSettings();
  if (!settings.datevConsultantNo || !settings.datevClientNo) {
    return Response.json({ ok: false, error: await translateMessage("students.errors.datevSettingsMissing") }, { status: 409 });
  }
  const now = new Date();
  const guardians = await listGuardiansForDatev();
  const csv = buildDatevDebtorsCsv(guardians, {
    consultantNo: settings.datevConsultantNo,
    clientNo: settings.datevClientNo,
    fiscalYearStart: `${now.getUTCFullYear()}0101`,
    now,
  });
  // Kişisel veri içerir: denetim kaydına yalnızca sayı yazılır.
  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "StudentGuardian",
    after: { format: "DATEV Debitoren", count: guardians.length },
  });
  return new Response(Buffer.from(csv), {
    headers: {
      "Content-Type": "text/csv; charset=windows-1252",
      "Content-Disposition": `attachment; filename="EXTF_Debitoren_${now.toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
