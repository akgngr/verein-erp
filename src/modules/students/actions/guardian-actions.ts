"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { studentsPermissions } from "../permissions";
import { guardianDeleteSchema, guardianSchema, guardianUpdateSchema, type GuardianInput } from "../schemas/guardian";
import { allocateDebtorNumber, withUniqueRetry } from "../services/numbers";
import { normalizeIban, parseDateOnly } from "../utils";

function guardianData(input: GuardianInput) {
  return {
    salutation: input.salutation || null,
    firstName: input.firstName,
    lastName: input.lastName,
    street: input.street || null,
    houseNumber: input.houseNumber || null,
    postalCode: input.postalCode || null,
    city: input.city || null,
    country: input.country,
    email: input.email ? input.email.toLowerCase() : null,
    phone: input.phone || null,
    iban: normalizeIban(input.iban),
    bic: input.bic ? input.bic.toUpperCase() : null,
    accountHolder: input.accountHolder || null,
    sepaMandateReference: input.sepaMandateReference || null,
    sepaMandateDate: parseDateOnly(input.sepaMandateDate),
    note: input.note || null,
  };
}

export async function createGuardianAction(input: unknown): Promise<ActionResult<{ id: string; debtorNumber: number }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "create" },
    schema: guardianSchema,
    handler: async ({ input, user, audit }) => {
      const created = await withUniqueRetry(() =>
        getDb().$transaction(async (tx) =>
          tx.studentGuardian.create({
            data: {
              ...guardianData(input),
              debtorNumber: await allocateDebtorNumber(tx),
              createdById: user.id,
              createdByLabel: buildUserLabel(user.name, user.email),
            },
          }),
        ),
      );
      await audit({ action: "CREATE", entity: "StudentGuardian", entityId: created.id, after: { debtorNumber: created.debtorNumber } });
      return { id: created.id, debtorNumber: created.debtorNumber };
    },
  });
  return run(input);
}

export async function updateGuardianAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "update" },
    schema: guardianUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.studentGuardian.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!existing) throw new ActionError("students.errors.guardianNotFound");
      await db.studentGuardian.update({ where: { id: existing.id }, data: guardianData(input) });
      // KARAR: IBAN gibi hassas alanlar denetim kaydına yazılmaz; yalnızca numara.
      await audit({ action: "UPDATE", entity: "StudentGuardian", entityId: existing.id, after: { debtorNumber: existing.debtorNumber } });
      return { id: existing.id };
    },
  });
  return run(input);
}

/** Yumuşak silme; Debitor numarası tekrar kullanılmaz (DATEV'de hesap geçmişi korunur). */
export async function deleteGuardianAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: studentsPermissions, action: "delete" },
    schema: guardianDeleteSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.studentGuardian.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!existing) throw new ActionError("students.errors.guardianNotFound");
      await db.$transaction([
        db.studentGuardianLink.deleteMany({ where: { guardianId: existing.id } }),
        db.studentGuardian.update({ where: { id: existing.id }, data: { deletedAt: new Date() } }),
      ]);
      await audit({ action: "DELETE", entity: "StudentGuardian", entityId: existing.id, before: { debtorNumber: existing.debtorNumber } });
      return { id: existing.id };
    },
  });
  return run(input);
}
