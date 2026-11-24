"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";

import { createAction } from "@/modules/auth/server";
import { createGeneratedFile } from "@/modules/exports/server";
import { can } from "@/shared/permissions/define";
import type { ActionResult } from "@/shared/types/action";

import { compliancePermissions } from "../permissions";
import { buildComplianceExportMarkdown } from "../services/export-report";
import { runCockpit } from "../services/run";

const exportSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  preview: z.boolean().default(false),
  format: z.enum(["pdf", "csv"]),
});

export async function exportComplianceReportAction(
  input: unknown,
): Promise<ActionResult<{ id: string; url: string; format: "pdf" | "csv" }>> {
  return createAction({
    permission: { definition: compliancePermissions, action: "view" },
    schema: exportSchema,
    handler: async ({ input, user, audit }) => {
      const locale = await getLocale();
      const lang: "tr" | "de" = locale === "de" ? "de" : "tr";
      const allowPreview = input.preview && can(user.role, compliancePermissions, "update");
      const rows = await runCockpit(user, { year: input.year, preview: allowPreview });
      const markdown = buildComplianceExportMarkdown({
        year: input.year,
        lang,
        rows,
        preview: allowPreview,
      });

      const title =
        lang === "de"
          ? `Compliance-Check ${input.year}`
          : `Uyum kontrolü ${input.year}`;

      const generated = await createGeneratedFile({
        ownerId: user.id,
        title,
        format: input.format,
        markdown,
        source: "compliance",
      });

      await audit({
        action: "EXPORT",
        entity: "ComplianceReport",
        entityId: generated.id,
        after: { year: input.year, format: input.format, preview: allowPreview },
      });

      return { id: generated.id, url: generated.url, format: input.format };
    },
  })(input);
}
