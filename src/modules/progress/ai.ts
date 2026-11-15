import "server-only";
import {aiToolV2,defineModuleAiV2} from "@/shared/ai/v2";

import { z } from "zod";

import { can } from "@/shared/permissions/define";

import { progressPermissions } from "./permissions";
import { getProgressStats } from "./server";

/** Öğrenci takibi: yalnızca istatistik. Sözleşme: src/shared/ai/define.ts. */
const output=z.object({days:z.number().int(),attendance:z.object({present:z.number().int(),late:z.number().int(),absent:z.number().int(),excused:z.number().int(),ratePercent:z.number().nullable()}).strict(),assessments:z.number().int(),notes:z.number().int()}).strict();

export const ai = defineModuleAiV2({
  module: "progress",
  tools: [
    aiToolV2({
      name: "get_progress_statistics",
      operation: "read",
      allowed: (user) => can(user.role, progressPermissions, "view"),
      description: "Student progress statistics for the last N days: attendance (present/late/absent/excused, rate %), number of assessments and notes. Counts only.", // i18n-ignore (model-facing tool text)
      input:z.object({days:z.number().int().min(1).max(365)}).strict(),result:output,modelOutput:output,
      policy:{"purpose": "progress-statistics", "serverReads": ["ProgressAttendance", "ProgressAssessment", "ProgressNote"], "modelFields": ["days", "attendance.present", "attendance.late", "attendance.absent", "attendance.excused", "attendance.ratePercent", "assessments", "notes"], "processing": "local_only"},projectForModel:result=>result,
      run: async ({ days }) => getProgressStats(days),
    }),
  ],
  actions: {},
});
