"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { createAction } from "@/modules/auth/server";

import { donationsPermissions } from "../permissions";
import { confirmTemplateSchema } from "../schemas/settings";
import { TEMPLATE_VERSION } from "../pdf/template-de";

/** Şablon metin onayı (§ 14): approve izni; sürüm + zaman + kullanıcı kaydedilir; audit TEMPLATE_CONFIRM. */
export async function confirmTemplateAction(): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: donationsPermissions, action: "approve" },
    schema: confirmTemplateSchema,
    handler: async ({ user, audit }) => {
      const db = getDb();
      const label = buildUserLabel(user.name, user.email);
      const now = new Date();

      await db.donationsSettings.upsert({
        where: { id: "singleton" },
        update: {
          templateConfirmedVersion: TEMPLATE_VERSION,
          templateConfirmedAt: now,
          templateConfirmedById: user.id,
          templateConfirmedByLabel: label,
        },
        create: {
          id: "singleton",
          templateConfirmedVersion: TEMPLATE_VERSION,
          templateConfirmedAt: now,
          templateConfirmedById: user.id,
          templateConfirmedByLabel: label,
        },
      });

      await audit({
        action: "TEMPLATE_CONFIRM",
        entity: "DonationsSettings",
        entityId: "singleton",
        after: { templateVersion: TEMPLATE_VERSION },
      });

      return undefined;
    },
  });

  return run({}) as Promise<ActionResult>;
}
