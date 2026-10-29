"use server";

import { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import { toCents, centsToDecimalString } from "@/shared/money";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { memberPaymentsPermissions } from "../permissions";
import {
  dueAddSchema,
  dueDeleteSchema,
  dueUpdateSchema,
  generateDuesSchema,
} from "../schemas/dues";
import { recalculateDueStatus } from "../services/dues-calculation";
import { generateDues, getDuesGenerationPreview } from "../services/dues-generation";
import { parseDateOnly } from "../utils";

/**
 * Yıllık aidat satırı aksiyonları (Faz 3 eklemeleri).
 *
 * İzin şeması (iş emri § 6 uyarlaması): üretim/ekleme → memberPayments.create;
 * düzenleme/muafiyet/silme → memberPayments.update. Böylece VIEWER raporu
 * görebilir ama yazamaz; TREASURER üretebilir ve düzenleyebilir.
 */

export type GenerateDuesResult = {
  mode: "preview" | "commit";
  year: number;
  eligibleCount: number;
  totalAmountCents: number;
  skippedNoAmountCount: number;
  skippedExistingCount: number;
  created: number | null;
};

/** Toplu aidat üretimi: önce dryRun önizleme, sonra onaylı üretim. */
export async function generateDuesAction(
  input: unknown,
): Promise<ActionResult<GenerateDuesResult>> {
  const run = createAction({
    permission: { definition: memberPaymentsPermissions, action: "create" },
    schema: generateDuesSchema,
    handler: async ({ input, user, audit }) => {
      const dueDate = parseDateOnly(input.dueDate);
      if (!dueDate) {
        throw new ActionError("members.errors.dateInvalid", {
          dueDate: ["members.validation.dueDateInvalid"],
        });
      }
      // İş emri: son ödeme tarihi aidat yılı içinde veya sonrası olmalı.
      const yearStart = new Date(Date.UTC(input.year, 0, 1));
      if (dueDate.getTime() < yearStart.getTime()) {
        throw new ActionError("members.errors.dueBeforeYear", {
          dueDate: ["Son ödeme tarihi aidat yılı içinde veya sonrasında olmalıdır."],
        });
      }

      if (input.dryRun) {
        const preview = await getDuesGenerationPreview(input.year);
        return { mode: "preview" as const, ...preview, created: null };
      }

      const result = await generateDues({
        year: input.year,
        dueDate,
        userId: user.id,
        userLabel: buildUserLabel(user.name, user.email),
      });

      await audit({
        action: "DUES_GENERATE",
        entity: "MemberDue",
        after: {
          year: input.year,
          created: result.created,
          totalAmountCents: result.totalAmountCents,
          dueDate: input.dueDate,
        },
      });

      return {
        mode: "commit" as const,
        year: input.year,
        eligibleCount: result.created,
        totalAmountCents: result.totalAmountCents,
        skippedNoAmountCount: 0,
        skippedExistingCount: 0,
        created: result.created,
      };
    },
  });

  return run(input) as Promise<ActionResult<GenerateDuesResult>>;
}

/** Tek üyeye tek yıl için aidat satırı ekleme. */
export async function addDueAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: memberPaymentsPermissions, action: "create" },
    schema: dueAddSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      const member = await db.member.findFirst({
        where: { id: input.memberId, deletedAt: null },
        select: { id: true, membershipNumber: true },
      });
      if (!member) {
        throw new ActionError("members.errors.memberNotFound", {
          memberId: ["Geçerli bir üye seçin."],
        });
      }

      const cents = toCents(input.amount);
      if (cents === null || cents <= 0) {
        throw new ActionError("members.errors.amountInvalid", {
          amount: ["0'dan büyük bir tutar girin (en fazla 2 ondalık)."],
        });
      }
      if (cents > 999_999_999) {
        throw new ActionError("members.errors.amountTooLarge", {
          amount: ["Tutar en fazla 9.999.999,99 € olabilir."],
        });
      }

      const dueDate = parseDateOnly(input.dueDate);
      if (!dueDate) {
        throw new ActionError("members.errors.dateInvalid", {
          dueDate: ["members.validation.dueDateInvalid"],
        });
      }

      let created;
      try {
        created = await db.memberDue.create({
          data: {
            memberId: member.id,
            year: input.year,
            amountDue: centsToDecimalString(cents),
            dueDate,
            note: input.note,
            createdById: user.id,
            createdByLabel: buildUserLabel(user.name, user.email),
          },
        });
      } catch (error) {
        // KARAR: @@unique([memberId, year]) çakışması kullanıcı hatasıdır —
        // P2002'yi anlamlı Türkçe mesaja çeviriyoruz.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ActionError("members.errors.duesExists", {
            year: ["Bu yıl için aidat satırı zaten mevcut."],
          });
        }
        throw error;
      }

      await audit({
        action: "DUE_ADD",
        entity: "MemberDue",
        entityId: created.id,
        after: {
          memberNumber: member.membershipNumber,
          year: created.year,
          amountCents: cents,
          dueDate: input.dueDate,
        },
      });

      return { id: created.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

/** Aidat satırı düzenleme (tutar/son ödeme tarihi/not/muafiyet). */
export async function updateDueAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: memberPaymentsPermissions, action: "update" },
    schema: dueUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();

      const due = await db.memberDue.findFirst({
        where: { id: input.id },
        include: { member: { select: { membershipNumber: true } } },
      });
      if (!due) throw new ActionError("members.errors.duesNotFound");

      const paidAggregate = await db.memberPayment.aggregate({
        where: { memberId: due.memberId, dueYear: due.year, voidedAt: null },
        _sum: { amount: true },
      });
      const paidCents = Number(paidAggregate._sum.amount?.mul(100).toFixed(0) ?? 0);

      const cents = toCents(input.amount);
      if (cents === null || cents <= 0) {
        throw new ActionError("members.errors.amountInvalid", {
          amount: ["0'dan büyük bir tutar girin (en fazla 2 ondalık)."],
        });
      }
      // İş emri: tutar ödenenin altına düşürülemez.
      if (cents < paidCents) {
        throw new ActionError("members.errors.duesBelowPaid", {
          amount: ["Tutar en az ödenen tutar kadar olmalıdır."],
        });
      }

      const dueDate = parseDateOnly(input.dueDate);
      if (!dueDate) {
        throw new ActionError("members.errors.dateInvalid", {
          dueDate: ["members.validation.dueDateInvalid"],
        });
      }

      // Muafiyet: ödemesi olan satır muaf yapılamaz (para gerçekten alındı).
      if (input.waived && paidCents > 0) {
        throw new ActionError("members.errors.duesWaiveWithPayments", {
          waived: ["Önce ödemeleri iptal edin veya satırı muaf yapmayın."],
        });
      }

      await db.$transaction(async (tx) => {
        await tx.memberDue.update({
          where: { id: due.id },
          data: {
            amountDue: centsToDecimalString(cents),
            dueDate,
            note: input.note,
            // KARAR: WAIVED elle verilir/kaldırılır; açık durum yeniden
            // türetilir (recalculateDueStatus PARTIAL/PAID'e çevirebilir).
            status: input.waived ? "WAIVED" : "OPEN",
          },
        });
        await recalculateDueStatus(tx, due.memberId, due.year);
      });

      await audit({
        action: "DUE_UPDATE",
        entity: "MemberDue",
        entityId: due.id,
        before: {
          memberNumber: due.member.membershipNumber,
          year: due.year,
          status: due.status,
        },
        after: {
          memberNumber: due.member.membershipNumber,
          year: due.year,
          amountCents: cents,
          dueDate: input.dueDate,
          waived: input.waived,
        },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}

/** Aidat satırı silme — yalnızca ödemesi yoksa (yetki: memberPayments.update). */
export async function deleteDueAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: memberPaymentsPermissions, action: "update" },
    schema: dueDeleteSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();

      const due = await db.memberDue.findFirst({
        where: { id: input.id },
        include: { member: { select: { membershipNumber: true } } },
      });
      if (!due) throw new ActionError("members.errors.duesNotFound");

      const paymentCount = await db.memberPayment.count({
        where: { memberId: due.memberId, dueYear: due.year, voidedAt: null },
      });
      // İş emri: ödemesi olan satır silinmez (önce ödemeler iptal edilmeli).
      if (paymentCount > 0) {
        throw new ActionError("members.errors.dueHasPayments");
      }

      await db.memberDue.delete({ where: { id: due.id } });

      await audit({
        action: "DUE_DELETE",
        entity: "MemberDue",
        entityId: due.id,
        before: {
          memberNumber: due.member.membershipNumber,
          year: due.year,
          status: due.status,
        },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
