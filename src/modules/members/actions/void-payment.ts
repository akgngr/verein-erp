"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { memberPaymentsPermissions } from "../permissions";
import { paymentVoidSchema } from "../schemas/payment";

/**
 * Ödeme iptali (void) — Faz 4 (4.1): izin memberPayments.delete, ADMIN + TREASURER.
 * KARAR: Ödeme ASLA sert silinmez; voidedAt/By/Reason yazılır, makbuz PDF'inde
 * STORNIERT işareti basılır. Muhasebe fişinin ters kaydı üyelik aktarımında
 * (accounting member-sync) otomatik yapılır — burada muhasebeye DOKUNULMAZ
 * (members → accounting bağımlılığı yasak; tersi yönde servis çağrısı izinli).
 */
export async function voidPaymentAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: memberPaymentsPermissions, action: "delete" },
    schema: paymentVoidSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      const payment = await db.memberPayment.findFirst({
        where: { id: input.id },
        include: { member: { select: { membershipNumber: true } } },
      });
      if (!payment) throw new ActionError("Ödeme bulunamadı.");
      if (payment.voidedAt) throw new ActionError("Bu ödeme zaten iptal edilmiş.");

      const voidedAt = new Date();
      const voidedByLabel = buildUserLabel(user.name, user.email);

      const updated = await db.memberPayment.update({
        where: { id: payment.id },
        data: {
          voidedAt,
          voidedById: user.id,
          voidedByLabel,
          voidReason: input.reason,
        },
      });

      await audit({
        action: "VOID",
        entity: "MemberPayment",
        entityId: updated.id,
        before: { receiptNumber: payment.receiptNumber, voidedAt: null },
        after: {
          receiptNumber: payment.receiptNumber,
          memberNumber: payment.member.membershipNumber,
          voidedAt: voidedAt.toISOString(),
          reason: input.reason,
        },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
