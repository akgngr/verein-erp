import "server-only";

import { z } from "zod";

import { NO_INPUT, aiTool, defineModuleAi } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { organizationPermissions } from "./permissions";
import { getOrganizationProfile } from "./server";

/** Dernek bilgileri: kamuya açık ana veriler; vergi bilgileri hariç. Sözleşme: src/shared/ai/define.ts. */
export const ai = defineModuleAi({
  module: "organization",
  tools: [
    aiTool({
      name: "get_organization_info",
      operation: "read",
      allowed: (user) => can(user.role, organizationPermissions, "view"),
      description: "The association's public master data: name, address, contact, register court/number, charitable purposes. Tax number and tax-office data are excluded.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: NO_INPUT,
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
    }),
  ],
  actions: {},
});
