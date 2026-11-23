"use server";

import { z } from "zod";
import { createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import type { ActionResult } from "@/shared/types/action";

import { getMonthlyEgressReport, type MonthlyEgressReport } from "../services/egress-report";
import {
  applyPrivacyPreset,
  previewPrivacyPreset,
  PRIVACY_PRESET_IDS,
  type ApplyPrivacyPresetResult,
  type PrivacyPresetPreview,
} from "../services/privacy-presets";

const monthlyReportSchema = z
  .object({
    year: z.number().int().min(2020).max(2100).optional(),
    month: z.number().int().min(1).max(12).optional(),
  })
  .optional();

const previewPresetSchema = z.object({
  presetId: z.enum(PRIVACY_PRESET_IDS),
});

const applyPresetSchema = z.object({
  presetId: z.enum(PRIVACY_PRESET_IDS),
  approved: z.literal(true),
});

export async function getMonthlyEgressReportAction(input?: {
  year?: number;
  month?: number;
}): Promise<ActionResult<MonthlyEgressReport>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "view" },
    schema: monthlyReportSchema,
    handler: async ({ input: parsed }) => {
      return getMonthlyEgressReport(parsed);
    },
  });

  return run(input ?? {}) as Promise<ActionResult<MonthlyEgressReport>>;
}

export async function previewPrivacyPresetAction(input: {
  presetId: (typeof PRIVACY_PRESET_IDS)[number];
}): Promise<ActionResult<PrivacyPresetPreview>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "view" },
    schema: previewPresetSchema,
    handler: async ({ input: parsed }) => {
      return previewPrivacyPreset(parsed.presetId);
    },
  });

  return run(input) as Promise<ActionResult<PrivacyPresetPreview>>;
}

export async function applyPrivacyPresetAction(input: {
  presetId: (typeof PRIVACY_PRESET_IDS)[number];
  approved: true;
}): Promise<ActionResult<ApplyPrivacyPresetResult>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: applyPresetSchema,
    handler: async ({ input: parsed, user }) => {
      return applyPrivacyPreset(parsed.presetId, {
        userId: user.id,
        userLabel: user.name || user.email || user.id,
      });
    },
  });

  return run(input) as Promise<ActionResult<ApplyPrivacyPresetResult>>;
}
