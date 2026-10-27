"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { runMemberSync } from "../services/member-sync";
import { z } from "zod";

/** Üyelik aktarımı önizleme (§ 11.7) — izin accounting.view. */
export async function previewMemberSyncAction(): Promise<ActionResult<Awaited<ReturnType<typeof runMemberSyncPreview>>>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "view" },
    schema: z.object({}).passthrough(),
    handler: async () => runMemberSyncPreview(),
  });

  return run({}) as Promise<ActionResult<Awaited<ReturnType<typeof runMemberSyncPreview>>>>;
}

async function runMemberSyncPreview() {
  const { previewMemberSync } = await import("../services/member-sync");
  return previewMemberSync();
}

/** Üyelik aktarımını çalıştır (§ 8 md. 15 md. 4) — izin accounting.create. */
export async function runMemberSyncAction(): Promise<
  ActionResult<{ createdCount: number; reversedCount: number; skippedCount: number }>
> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: z.object({}).passthrough(),
    handler: async ({ user, audit }) => {
      const db = getDb();
      const label = buildUserLabel(user.name, user.email);

      const result = await runMemberSync({ id: user.id, label });

      // Audit: tek SYNC_MEMBER_PAYMENTS kaydı (sayılar + toplamlar; § 13).
      await audit({
        action: "SYNC_MEMBER_PAYMENTS",
        entity: "AccountingBooking",
        entityId: undefined,
        after: {
          createdCount: result.createdCount,
          reversedCount: result.reversedCount,
          skippedCount: result.skippedCount,
        },
      });

      void db;

      return {
        createdCount: result.createdCount,
        reversedCount: result.reversedCount,
        skippedCount: result.skippedCount,
      };
    },
  });

  return run({}) as Promise<
    ActionResult<{ createdCount: number; reversedCount: number; skippedCount: number }>
  >;
}
