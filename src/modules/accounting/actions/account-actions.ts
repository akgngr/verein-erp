"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingSetupPermissions } from "../permissions";
import { accountCreateSchema, accountUpdateSchema } from "../schemas/account";
import { parseDateOnly } from "../utils";

/** Hesap oluştur (§ 8 md. 11): ad benzersiz (P2002), açılış bakiyesi ≥ 0 (CASH Kassenminus). */
export async function createAccountAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "create" },
    schema: accountCreateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const openingDate = parseDateOnly(input.openingDate);
      if (!openingDate) {
        throw new ActionError("Açılış tarihi geçersiz.", {
          openingDate: ["Geçerli bir tarih girin."],
        });
      }
      const openingCents = toCents(input.openingBalance) ?? 0;
      if (openingCents < 0) {
        throw new ActionError("Açılış bakiyesi negatif olamaz.", {
          openingBalance: ["0 veya pozitif bir tutar girin."],
        });
      }

      try {
        const created = await db.accountingAccount.create({
          data: {
            name: input.name,
            type: input.type,
            openingBalance: (openingCents / 100).toFixed(2),
            openingDate,
          },
        });
        await audit({
          action: "CREATE",
          entity: "AccountingAccount",
          entityId: created.id,
          after: { name: created.name, type: created.type, openingBalanceCents: openingCents },
        });
        return { id: created.id };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ActionError("Bu hesap adı zaten kullanılıyor.", {
            name: ["Farklı bir hesap adı girin."],
          });
        }
        throw error;
      }
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

/** Hesap güncelleme şeması: id + güncellenebilir alanlar. */
const accountEditSchema = z.object({
  id: z.string().min(1),
  name: accountUpdateSchema.shape.name,
  type: accountUpdateSchema.shape.type,
  openingBalance: accountUpdateSchema.shape.openingBalance.optional(),
  openingDate: accountUpdateSchema.shape.openingDate.optional(),
  isActive: accountUpdateSchema.shape.isActive,
});

/**
 * Hesap güncelleme (§ 8 md. 11): ad her zaman; açılış bakiyesi/tarihi YALNIZCA
 * fişi olmayan hesapta; aktif/pasif geçişi isActive ile (audit ACTIVATE/DEACTIVATE).
 */
export async function updateAccountAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "update" },
    schema: accountEditSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.accountingAccount.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("Hesap bulunamadı.");

      const hasBookings = await db.accountingBooking.count({
        where: { OR: [{ accountId: existing.id }, { counterAccountId: existing.id }] },
      });

      const data: Prisma.AccountingAccountUpdateInput = {
        name: input.name,
        type: input.type,
        isActive: input.isActive ?? existing.isActive,
      };

      if (input.openingDate) {
        if (hasBookings > 0) {
          throw new ActionError("Hareketi olan hesabın açılış bakiyesi değiştirilemez.");
        }
        const openingDate = parseDateOnly(input.openingDate);
        if (!openingDate) {
          throw new ActionError("Açılış tarihi geçersiz.", {
            openingDate: ["Geçerli bir tarih girin."],
          });
        }
        const openingCents = toCents(input.openingBalance || "0") ?? 0;
        if (openingCents < 0) {
          throw new ActionError("Açılış bakiyesi negatif olamaz.", {
            openingBalance: ["0 veya pozitif bir tutar girin."],
          });
        }
        data.openingBalance = (openingCents / 100).toFixed(2);
        data.openingDate = openingDate;
      }

      await db.accountingAccount.update({ where: { id: existing.id }, data });
      await audit({
        action:
          input.isActive === false
            ? "DEACTIVATE"
            : input.isActive === true
              ? "ACTIVATE"
              : "UPDATE",
        entity: "AccountingAccount",
        entityId: existing.id,
        before: { name: existing.name, isActive: existing.isActive },
        after: { name: input.name, isActive: input.isActive ?? existing.isActive },
      });
      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
