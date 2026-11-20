"use server";

import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { secretaryPermissions } from "../permissions";
import { getWeeklyReportState, requestWeeklyReport, WeeklyReportError } from "../services/weekly-report-runner";

/** S5.1 (#315): haftalık kurul raporu üretimini başlat (Files kuyruğu). Hazır olunca "Dosyalarım"da görünür. */
export async function requestWeeklyReportAction(input: unknown): Promise<ActionResult<{ generationId: string }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({}).strict(),
    handler: async ({ user, audit }) => {
      try {
        const result = await requestWeeklyReport(user);
        await audit({ action: "EXPORT", entity: "SecretaryWeeklyReport", entityId: result.generationId, after: { format: "pdf" } });
        return result;
      } catch (error) {
        if (error instanceof WeeklyReportError) throw new ActionError(error.message);
        if (error instanceof Error && /^FILE_(GENERATION_DISABLED|MODULE_UNAVAILABLE)$/.test(error.message)) throw new ActionError("secretary.weeklyReport.errors.unavailable");
        throw error;
      }
    },
  })(input ?? {});
}

export async function getWeeklyReportStateAction(input: unknown) {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({ generationId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/) }).strict(),
    handler: async ({ input, user }) => {
      const state = await getWeeklyReportState(user.id, input.generationId);
      if (!state) throw new ActionError("secretary.weeklyReport.errors.notFound");
      return state;
    },
  })(input);
}
