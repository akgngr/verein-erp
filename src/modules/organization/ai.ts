import "server-only";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";

import { z } from "zod";

import { can } from "@/shared/permissions/define";

import { organizationPermissions } from "./permissions";
import { getOrganizationProfile } from "./server";

/** Dernek bilgileri: kamuya açık ana veriler; vergi bilgileri hariç. Sözleşme: src/shared/ai/define.ts. */
export const ai = defineModuleAiV2({
  module: "organization",
  tools: [
    aiToolV2({
      name: "get_organization_info",
      operation: "read",
      allowed: (user) => can(user.role, organizationPermissions, "view"),
      description: "The association's public master data: name, address, contact, register court/number, charitable purposes. Tax number and tax-office data are excluded.", // i18n-ignore (model-facing tool text)
      input: z.object({}),
      run: async () => {
        const profile = await getOrganizationProfile();
        // KARAR: vergi numarası, vergi dairesi ve muafiyet belgesi ayrıntıları bilinçli olarak hariç.
        return {
          name: profile.name,
          address: [profile.street, [profile.postalCode, profile.city].filter(Boolean).join(" "), profile.country].filter(Boolean).join(", ") || null,
          email: profile.email,
          phone: profile.phone,
          website: profile.website,
          registerCourt: profile.registerCourt,
          registerNumber: profile.registerNumber,
          charitablePurposes: profile.charitablePurposes,
          membershipFeesDeductible: profile.membershipFeesDeductible,
        };
      },
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "organization-get-organization-info", "serverReads": ["OrganizationProfile"], "modelFields": ["name", "address", "email", "phone", "website", "registerCourt", "registerNumber", "charitablePurposes", "membershipFeesDeductible"], "processing": "approved_provider", "modelDataClass": "internal"},
    }),
  ],
  actions: {},
});
