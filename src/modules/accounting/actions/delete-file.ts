"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";

import { z } from "zod";

const deleteFileSchema = z.object({ fileId: z.string().min(1) });

/**
 * Fiş dosyası yumuşak silme (§ 9): izin accounting.delete; kilit yılda
 * REDDEDİLİR; disk dosyasına dokunulmaz (Faz 1 kuralı — retention).
 */
export async function deleteBookingFileAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "delete" },
    schema: deleteFileSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const label = buildUserLabel(user.name, user.email);

      const file = await db.accountingBookingFile.findFirst({
        where: { id: input.fileId, deletedAt: null },
        include: { booking: { select: { bookingNumber: true, year: true } } },
      });
      if (!file) throw new ActionError("Dosya bulunamadı.");

      const lock = await db.accountingYear.findUnique({ where: { year: file.booking.year } });
      if (lock?.lockedAt) {
        throw new ActionError(
          `${file.booking.year} yılı kilitli; belge silinemez (geç belge yüklemesi serbesttir).`,
        );
      }

      await db.accountingBookingFile.update({
        where: { id: file.id },
        data: {
          deletedAt: new Date(),
          deletedById: user.id,
          deletedByLabel: label,
        },
      });

      await audit({
        action: "FILE_DELETE",
        entity: "AccountingBookingFile",
        entityId: file.id,
        before: { bookingNumber: file.booking.bookingNumber, originalName: file.originalName },
        after: null,
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
