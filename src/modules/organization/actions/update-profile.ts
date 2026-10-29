"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { organizationPermissions } from "../permissions";
import { organizationUpdateSchema } from "../schemas/profile";
import { toProfileDbData } from "../queries/get-profile";

/**
 * Dernek ana verilerini günceller (Faz 4, 4.2). İlk kayıtta upsert ile satır
 * oluşur. Eşzamanlılık koruması: istemciden gelen updatedAt beklenenden farklıysa
 * işlem reddedilir (başka bir kullanıcı araya girdi).
 *
 * Audit: UPDATE / OrganizationProfile. KARAR (gizlilik): derneğin KAMU verileri
 * (ad, adres, sicil, vergi) before/after değerleriyle yazılır — bunlar kişisel
 * veri değildir; kimlikNo gibi özel alanlar bu modelde hiç yoktur.
 */
export async function updateOrganizationProfileAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: organizationPermissions, action: "update" },
    schema: organizationUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const data = toProfileDbData(input);

      const existing = await db.organizationProfile.findUnique({ where: { id: "singleton" } });

      if (existing) {
        // Eşzamanlılık: istemcinin gördüğü updatedAt ile sunucudaki aynı olmalı
        // (ilk kayıtta satır yoktur, karşılaştırma yapılmaz).
        if (input.updatedAt && input.updatedAt !== existing.updatedAt.toISOString()) {
          throw new ActionError("common.errors.staleRecord");
        }
        await db.organizationProfile.update({ where: { id: "singleton" }, data });
      } else {
        await db.organizationProfile.create({
          data: {
            id: "singleton",
            ...data,
            updatedById: user.id,
            updatedByLabel: buildUserLabel(user.name, user.email),
          },
        });
      }

      const changed = Object.keys(data).filter(
        (key) =>
          existing &&
          JSON.stringify(data[key as keyof typeof data]) !==
            JSON.stringify(existing[key as keyof typeof existing] ?? null),
      );

      await audit({
        action: "UPDATE",
        entity: "OrganizationProfile",
        entityId: "singleton",
        before: existing
          ? {
              name: existing.name,
              registerCourt: existing.registerCourt,
              registerNumber: existing.registerNumber,
              taxNumber: existing.taxNumber,
              taxOffice: existing.taxOffice,
            }
          : null,
        after: {
          name: data.name,
          registerCourt: data.registerCourt,
          registerNumber: data.registerNumber,
          taxNumber: data.taxNumber,
          taxOffice: data.taxOffice,
          changedFields: changed,
          // Faz 5 (§ 4): aidat indirilebilirliği bayrağı eski/yeni değeriyle yazılır.
          ...(changed.includes("membershipFeesDeductible")
            ? {
                membershipFeesDeductible: {
                  old: existing?.membershipFeesDeductible ?? null,
                  new: data.membershipFeesDeductible,
                },
              }
            : {}),
        },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
