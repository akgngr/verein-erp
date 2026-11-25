"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { getGobdStatus } from "../queries/gobd";
import { closeYearSchema, unlockYearSchema } from "../schemas/year";
import { recordSystemJournalEvent } from "../services/journal";
import { berlinToday } from "../utils";

/** Yılı kapat (§ 8 md. 8): kilit; onay izni (approve), tamamlanmış mali yıl ve temiz GoBD günlüğü gerekir. */
export async function closeYearAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: closeYearSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const label = buildUserLabel(user.name, user.email);

      const currentYear = berlinToday().getUTCFullYear();
      if (input.year >= currentYear) {
        throw new ActionError("accounting.errors.yearNotFinished", undefined, { year: input.year });
      }

      const existing = await db.accountingYear.findUnique({ where: { year: input.year } });
      if (existing?.lockedAt) {
        throw new ActionError("accounting.errors.yearAlreadyLocked", undefined, { year: input.year });
      }

      // GoBD ön kontrolü: hash zinciri bozuk veya günlüklenmemiş fiş varsa kapanış engellenir.
      const gobd = await getGobdStatus(new Date(Date.UTC(input.year, 11, 31)));
      if (gobd.journal.problems.length > 0) {
        throw new ActionError("accounting.errors.yearCloseGobdFailed", undefined, { year: input.year });
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

/** Kilidi aç (§ 8 md. 8): gerekçe zorunlu, görev ayrılığı (ADMIN veya farklı onaylayıcı) ve GoBD günlüğü + audit. */
export async function unlockYearAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "approve" },
    schema: unlockYearSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const label = buildUserLabel(user.name, user.email);

      const existing = await db.accountingYear.findUnique({ where: { year: input.year } });
      if (!existing?.lockedAt) {
        throw new ActionError("accounting.errors.yearAlreadyOpen", undefined, { year: input.year });
      }

      if (existing.lockedById && existing.lockedById === user.id && user.role !== "ADMIN") {
        throw new ActionError("accounting.errors.unlockRequiresOtherApprover");
      }

      await db.$transaction(async (tx) => {
        await tx.accountingYear.update({
          where: { year: input.year },
          data: { lockedAt: null, lockedById: null, lockedByLabel: null },
        });
        await recordSystemJournalEvent(tx, {
          key: `YEAR:${input.year}`,
          label: `YEAR-${input.year}`,
          event: "YEAR_UNLOCK",
          snapshot: {
            year: input.year,
            reason: input.reason,
            previousLockedAt: existing.lockedAt?.toISOString() ?? null,
            previousLockedById: existing.lockedById ?? null,
          },
          actor: { id: user.id, label },
        });
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
