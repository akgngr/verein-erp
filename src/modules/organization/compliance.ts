import "server-only";

import { defineComplianceMetrics } from "@/shared/compliance/define";

import { organizationPermissions } from "./permissions";
import { getOrganizationProfile } from "./queries/get-profile";

/** Compliance metrics (ADR 0009): notice date and type only; no other organisation data. */
export const compliance = defineComplianceMetrics({
  module: "organization",
  metrics: [
    {
      key: "organization.exemptionNoticeDate",
      permission: { definition: organizationPermissions, action: "view" },
      read: async () => {
        const profile = await getOrganizationProfile();
        if (!profile.exemptionNoticeDate) return { kind: "date", value: null };
        return { kind: "date", value: profile.exemptionNoticeDate.toISOString().slice(0, 10), variant: profile.exemptionDocumentType ?? "EXEMPTION_NOTICE" };
      },
    },
  ],
});
