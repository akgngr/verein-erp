"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { contactSchema, contactUpdateSchema, type ContactInput } from "../schemas/contact";
import { nextContactNumber } from "../services/invoice-payments";

const fields = (input: ContactInput) => ({
  name: input.name,
  contactPerson: input.contactPerson || null,
  address: input.address || null,
  email: input.email || null,
  phone: input.phone || null,
  vatId: input.vatId ? input.vatId.replace(/\s/g, "").toUpperCase() : null,
  paymentTermDays: input.paymentTermDays ? Number(input.paymentTermDays) : null,
  notes: input.notes || null,
});

/** Cari kart oluştur: numara türün DATEV aralığındaki sonraki boş numara (eşzamanlılıkta unique korur). */
export async function createContactAction(input: unknown): Promise<ActionResult<{ id: string; number: number }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: contactSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const last = await db.accountingContact.findFirst({ where: { type: input.type }, orderBy: { number: "desc" }, select: { number: true } });
      let number: number;
      try {
        number = nextContactNumber(input.type, last?.number ?? null);
      } catch {
        throw new ActionError("accounting.contacts.errors.rangeExhausted");
      }
      const created = await db.accountingContact.create({ data: { type: input.type, number, ...fields(input) } });
      // KVKK: denetim kaydına kişisel veri yazılmaz (yalnızca numara/tür).
      await audit({ action: "CREATE", entity: "AccountingContact", entityId: created.id, after: { type: created.type, number } });
      revalidatePath("/muhasebe/cariler");
      return { id: created.id, number };
    },
  });
  return run(input);
}

export async function updateContactAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: contactUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.accountingContact.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("accounting.contacts.errors.notFound");
      // Tür değişmez (numara aralığı türe bağlı).
      await db.accountingContact.update({ where: { id: input.id }, data: { ...fields(input), isActive: input.isActive } });
      await audit({ action: "UPDATE", entity: "AccountingContact", entityId: input.id, after: { number: existing.number, isActive: input.isActive } });
      revalidatePath("/muhasebe/cariler");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
