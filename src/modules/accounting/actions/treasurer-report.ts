"use server";

import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";

import { createAction } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";
import { makeStoredName, saveFile } from "@/shared/files";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import type { ActionResult } from "@/shared/types/action";

import { TreasurerReportDocument } from "../pdf/treasurer-report-document";
import { accountingPermissions } from "../permissions";
import { getTreasurerReportData } from "../queries/treasurer-report";
import type { TreasurerReportResult } from "../services/treasurer-report";

const treasurerReportSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

const generatePdfSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  lang: z.enum(["de", "tr"]).default("de"),
});

/**
 * Genel Kurul Kassenbericht verilerini çeken server action (Q3).
 * Yetki: accounting.view
 */
export async function getTreasurerReportAction(
  input: unknown,
): Promise<ActionResult<TreasurerReportResult>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "view" },
    schema: treasurerReportSchema,
    handler: async ({ input }) => {
      return getTreasurerReportData(input.year);
    },
  });

  return run(input);
}

/**
 * Genel Kurul Kassenbericht PDF üretim action'ı (Q3).
 * Doğrudan unauthenticated stream yerine Files pipeline (src/shared/files)
 * üzerinden diskte güvenli oluşturur ve audit kaydı düşer.
 * Yetki: accounting.view
 */
export async function generateTreasurerReportPdfAction(
  input: unknown,
): Promise<ActionResult<{ storagePath: string; fileName: string; downloadUrl: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "view" },
    schema: generatePdfSchema,
    handler: async ({ input, audit }) => {
      const [report, profile, logoDataUri] = await Promise.all([
        getTreasurerReportData(input.year),
        getOrganizationProfile(),
        getOrganizationLogoDataUri(),
      ]);

      registerSharedPdfFonts();
      const docElement = createElement(TreasurerReportDocument, {
        data: {
          organization: { ...profile, logoDataUri },
          lang: input.lang,
          report,
        },
      }) as unknown as Parameters<typeof renderToBuffer>[0];
      const buffer = await renderToBuffer(docElement);

      const storedName = makeStoredName("pdf");
      const storagePath = ["accounting", "reports", String(input.year), storedName].join("/");
      await saveFile(storagePath, new Uint8Array(buffer));

      await audit({
        action: "EXPORT",
        entity: "AccountingBooking",
        entityId: undefined,
        after: { report: "treasurer-report-pdf", year: input.year, lang: input.lang, storagePath },
      });

      const fileName = `kassenbericht-${input.year}-${input.lang}.pdf`;
      const downloadUrl = `/api/accounting/reports/treasurer/pdf?file=${encodeURIComponent(storagePath)}&name=${encodeURIComponent(fileName)}`;

      return {
        storagePath,
        fileName,
        downloadUrl,
      };
    },
  });

  return run(input);
}
