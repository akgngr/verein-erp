"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { createAction } from "@/modules/auth/server";

import { studentsDatevPermissions } from "../permissions";
import { studentsSettingsSchema } from "../schemas/settings";

export async function saveStudentsSettingsAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const run = createAction({
    permission: { definition: studentsDatevPermissions, action: "update" },
    schema: studentsSettingsSchema,
    handler: async ({ input, audit }) => {
      const data = {
        datevConsultantNo: input.datevConsultantNo || null,
        datevClientNo: input.datevClientNo || null,
        debtorRangeStart: input.debtorRangeStart,
      };
      await getDb().studentsSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...data }, update: data });
      await audit({ action: "SETTINGS_UPDATE", entity: "StudentsSettings", entityId: "singleton", after: data });
      return { ok: true as const };
    },
  });
  return run(input);
}
