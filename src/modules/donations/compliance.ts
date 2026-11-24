import "server-only";

import { addYearsIso, defineComplianceMetrics } from "@/shared/compliance/define";
import { getDb } from "@/shared/db";

import { donationsPermissions } from "./permissions";

/**
 * Compliance metrics (ADR 0009). Count of receipts issued in the tax year after the general validity of the
 * notice printed in their own issuer snapshot. Validity years come from the rule params (by notice type).
 */
export const compliance = defineComplianceMetrics({
  module: "donations",
  metrics: [
    {
      key: "donations.receiptsOutsideNoticeValidity",
      permission: { definition: donationsPermissions, action: "view" },
      read: async ({ year, params }) => {
        const rows = await getDb().zuwendungConfirmation.findMany({ where: { year }, select: { issuedAt: true, issuerSnapshot: true } });
        let outside = 0;
        for (const row of rows) {
          const snapshot = (row.issuerSnapshot ?? {}) as { exemptionNoticeDate?: string | null; exemptionDocumentType?: string | null };
          const date = typeof snapshot.exemptionNoticeDate === "string" ? snapshot.exemptionNoticeDate.slice(0, 10) : null;
          const years = params[`addYears.${snapshot.exemptionDocumentType ?? "EXEMPTION_NOTICE"}`];
          if (!date || typeof years !== "number") continue;
          if (row.issuedAt.toISOString().slice(0, 10) > addYearsIso(date, years)) outside++;
        }
        return { kind: "number", value: outside, unit: "count" };
      },
    },
  ],
});
