"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { closeYearSchema, unlockYearSchema } from "../schemas/year";

/** Yılı kapat (§ 8 md. 8): kilit; onay izni (approve) gerekir. */
export async function closeYearAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: closeYearSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const label = buildUserLabel(user.name, user.email);

      const existing = await db.accountingYear.findUnique({ where: { year: input.year } });
      if (existing?.lockedAt) {
        throw new ActionError(`${input.year} yılı zaten kilitli.`);
      }

      await db.accountingYear.upsert({
        where: { year: input.year },
        update: {
          lockedAt: new Date(),
          lockedById: user.id,
          lockedByLabel: label,
        },
        create: {
          year: input.year,
          lockedAt: new Date(),
          lockedById: user.id,
          lockedByLabel: label,
        },
      });

      await audit({
        action: "YEAR_CLOSE",
        entity: "AccountingYear",
        entityId: String(input.year),
        after: { year: input.year },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}

/** Kilidi aç (§ 8 md. 8): gerekçe zorunlu; prominent audit YEAR_UNLOCK. */
export async function unlockYearAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: unlockYearSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();

      const existing = await db.accountingYear.findUnique({ where: { year: input.year } });
      if (!existing?.lockedAt) {
        throw new ActionError(`${input.year} yılı zaten açık.`);
      }

      await db.accountingYear.update({
        where: { year: input.year },
        data: { lockedAt: null, lockedById: null, lockedByLabel: null },
      });

      await audit({
        action: "YEAR_UNLOCK",
        entity: "AccountingYear",
        entityId: String(input.year),
        before: { year: input.year, lockedAt: existing.lockedAt.toISOString() },
        after: { year: input.year, reason: input.reason },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
