"use server";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { memberPaymentsPermissions } from "../permissions";
import { paymentCreateSchema } from "../schemas/payment";
import { allocateReceiptNumber, runWithReceiptNumberRetry } from "../services/receipt-number";
import { recalculateDueStatus } from "../services/dues-calculation";
import { berlinYear, parseDateOnly } from "../utils";

/**
 * Aidat ödemesi kaydı + makbuz numarası (Faz 4, 4.6).
 * KARAR: Ödemeler ASLA sert silinmez — yanlış kayıt voidPaymentAction ile iptal
 * edilir (neden zorunlu). Muhasebe fişi (sourceType = "MEMBER_PAYMENT") üyelik
 * aktarımıyla (accounting member-sync) oluşturulur; burada yazılmaz.
 */
export async function createPaymentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; receiptNumber: string }>> {
  const run = createAction({
    permission: { definition: memberPaymentsPermissions, action: "create" },
    schema: paymentCreateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      const member = await db.member.findFirst({
        where: { id: input.memberId, deletedAt: null },
      });
      if (!member) {
        throw new ActionError("Üye bulunamadı.", {
          memberId: ["Geçerli bir üye seçin."],
        });
      }

      const cents = toCents(input.amount);
      if (cents === null || cents <= 0) {
        throw new ActionError("Tutar geçersiz.", {
          amount: ["0'dan büyük bir tutar girin (en fazla 2 ondalık)."],
        });
      }
      if (cents > 999_999_999) {
        throw new ActionError("Tutar çok büyük.", {
          amount: ["Tutar en fazla 9.999.999,99 € olabilir."],
        });
      }

      const paidAt = parseDateOnly(input.paidAt);
      if (!paidAt) {
        throw new ActionError("Ödeme tarihi geçersiz.", {
          paidAt: ["Geçerli bir ödeme tarihi girin."],
        });
      }
      // KARAR: Gelecek tarihli ödeme kabul edilmez (ödeme gerçekleşmiş koddur).
      const today = berlinTodayStart();
      if (paidAt.getTime() > today.getTime()) {
        throw new ActionError("Ödeme tarihi gelecekte olamaz.", {
          paidAt: ["Ödeme tarihi bugünden sonra olamaz."],
        });
      }

      const createdByLabel = buildUserLabel(user.name, user.email);
      const year = berlinYear(paidAt);

      const created = await runWithReceiptNumberRetry(() =>
        db.$transaction(async (tx) => {
          const { sequence, receiptNumber } = await allocateReceiptNumber(tx, year);
          const payment = await tx.memberPayment.create({
            data: {
              year,
              sequence,
              receiptNumber,
              memberId: member.id,
              dueYear: input.dueYear,
              amount: cents.toFixed(2),
              method: input.method,
              paidAt,
              reference: input.reference,
              createdById: user.id,
              createdByLabel,
            },
          });
          // Faz 3 eklemeleri: ilgili yıllık aidat satırının durumu aynı
          // transaction içinde yeniden hesaplanır (satır yoksa işlem yok).
          await recalculateDueStatus(tx, member.id, input.dueYear);
          return payment;
        }),
      );

      // Gizlilik (Faz 4 kuralı): audit'te üye numarası kullanılır, ad yazılmaz.
      await audit({
        action: "CREATE",
        entity: "MemberPayment",
        entityId: created.id,
        after: {
          receiptNumber: created.receiptNumber,
          memberNumber: member.membershipNumber,
          dueYear: created.dueYear,
          amountCents: cents,
          method: created.method,
          paidAt: created.paidAt.toISOString().slice(0, 10),
        },
      });

      return { id: created.id, receiptNumber: created.receiptNumber };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; receiptNumber: string }>>;
}

/** Berlin bugünü (UTC gece yarısı) — gelecek tarih karşılaştırması için. */
function berlinTodayStart(): Date {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}
