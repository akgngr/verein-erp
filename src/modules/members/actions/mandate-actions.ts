"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { memberPaymentsPermissions } from "../permissions";
import { saveMemberMandate } from "../services/sepa-mandate";

const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
function ibanOk(raw: string): boolean {
  const iban = raw.replace(/\s/g, "").toUpperCase();
  if (!IBAN_RE.test(iban)) return false;
  let rest = 0;
  for (const char of iban.slice(4) + iban.slice(0, 4)) {
    for (const digit of /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char) rest = (rest * 10 + Number(digit)) % 97;
  }
  return rest === 1;
}

const schema = z.object({
  memberId: z.string().min(1).max(64),
  remove: z.boolean(),
  iban: z.string().trim().transform((value) => value.replace(/\s/g, "").toUpperCase()),
  bic: z.string().trim().max(11).transform((value) => value.toUpperCase() || null).refine((value) => value === null || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(value), "members.mandate.errors.bic"),
  accountHolder: z.string().trim().max(70),
  reference: z.string().trim().max(35).refine((value) => value === "" || /^[A-Za-z0-9+?/:().,'\- ]+$/.test(value), "members.mandate.errors.reference"),
  date: z.string(),
});

/** SEPA yetkisini kaydeder veya kaldırır (aidat yetkisi gerekir; IBAN kişisel veri, denetim kaydına değer yazılmaz). */
export async function saveMandateAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: memberPaymentsPermissions, action: "update" },
    schema,
    handler: async ({ input, audit }) => {
      if (input.remove) {
        await saveMemberMandate(input.memberId, null);
      } else {
        const fields: Record<string, string[]> = {};
        // Boş IBAN: mevcut IBAN korunur (tarayıcıya tam IBAN gönderilmez).
        const current = input.iban ? null : await getDb().member.findUnique({ where: { id: input.memberId }, select: { sepaIban: true } });
        const iban = input.iban || current?.sepaIban || "";
        if (!ibanOk(iban)) fields.iban = ["members.mandate.errors.iban"];
        if (!input.accountHolder) fields.accountHolder = ["members.mandate.errors.holder"];
        if (!input.reference) fields.reference = ["members.mandate.errors.reference"];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > new Date().toISOString().slice(0, 10)) fields.date = ["members.mandate.errors.date"];
        if (Object.keys(fields).length) throw new ActionError("members.mandate.errors.invalid", fields);
        const clash = await getDb().member.findFirst({ where: { sepaMandateReference: input.reference, id: { not: input.memberId } }, select: { id: true } });
        if (clash) throw new ActionError("members.mandate.errors.referenceTaken", { reference: ["members.mandate.errors.referenceTaken"] });
        await saveMemberMandate(input.memberId, { iban, bic: input.bic, accountHolder: input.accountHolder, reference: input.reference, date: input.date });
      }
      await audit({ action: "UPDATE", entity: "MemberSepaMandate", entityId: input.memberId, after: { removed: input.remove } });
      revalidatePath(`/uyeler/${input.memberId}`);
      return null;
    },
  })(input);
}
