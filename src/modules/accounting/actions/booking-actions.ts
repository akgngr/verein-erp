"use server";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import {
  bookingCreateSchema,
  bookingReverseSchema,
  bookingUpdateSchema,
} from "../schemas/booking";
import { assertNoNegativeCash, assertNoNegativeCashWithReplacement, toDecimal } from "../services/balances";
import { BookingRuleError, assertBookingDateAllowed, assertCategoryMatches } from "../services/booking-guards";
import { allocateBookingNumber, runWithBookingNumberRetry } from "../services/booking-number";
import { berlinYear, parseDateOnly } from "../utils";
import { effectiveTaxRate, getTaxSettings, taxColumnsFromGross } from "../services/tax";

function ruleError(error: unknown): never {
  if (error instanceof BookingRuleError) {
    throw new ActionError(error.message, undefined, error.values);
  }
  throw error;
}

/** Fiş verisi ortak alanlar (zod) → DB yazımına hazırlık: tutar cent + tarih Date. */
function parseCommon(input: {
  bookingDate: string;
  amount: string;
  accountId: string;
  counterparty?: string | null;
}) {
  const bookingDate = parseDateOnly(input.bookingDate);
  if (!bookingDate) {
    throw new ActionError("accounting.errors.bookingDateInvalid", {
      bookingDate: ["Geçerli bir fiş tarihi girin."],
    });
  }
  const cents = toCents(input.amount);
  if (cents === null || cents <= 0) {
    throw new ActionError("accounting.errors.amountInvalid", {
      amount: ["0'dan büyük bir tutar girin (en fazla 2 ondalık)."],
    });
  }
  if (cents > 999_999_999) {
    throw new ActionError("accounting.errors.amountTooLarge", {
      amount: ["Tutar en fazla 9.999.999,99 € olabilir."],
    });
  }
  return { bookingDate, cents, year: berlinYear(bookingDate) };
}

/**
 * Yeni fiş (§ 8 md. 1-2): gelir/gider/virman tek aksiyon. Numara atomik üretilir;
 * yıl kilidi, açılış tarihi, kategori yönü ve Kassenminus transaction içinde
 * denetlenir. Kaynak fişler (sourceType) buradan OLUŞTURULMAZ (KARAR: kaynak
 * modüller kendi fişini kendi transaction'ında yazar).
 */
export async function createBookingAction(
  input: unknown,
): Promise<ActionResult<{ id: string; bookingNumber: string }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "create" },
    schema: bookingCreateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const createdByLabel = buildUserLabel(user.name, user.email);
      const { bookingDate, cents, year } = parseCommon(input);

      try {
        const created = await runWithBookingNumberRetry(() =>
          db.$transaction(async (tx) => {
            if (input.type === "TRANSFER") {
              if (!input.counterAccountId) {
                throw new ActionError("accounting.errors.targetRequired", {
                  counterAccountId: ["Hedef hesap seçin."],
                });
              }
              if (input.counterAccountId === input.accountId) {
                throw new ActionError("accounting.errors.targetSameAsSource", {
                  counterAccountId: ["Farklı bir hedef hesap seçin."],
                });
              }
              await assertBookingDateAllowed({
                bookingDate,
                year,
                accountIds: [input.accountId, input.counterAccountId],
                tx,
              });
            } else {
              await assertBookingDateAllowed({
                bookingDate,
                year,
                accountIds: [input.accountId],
                tx,
              });
              await assertCategoryMatches(input.categoryId, input.type, tx);
            }

            const { sequence, bookingNumber } = await allocateBookingNumber(tx, year);
            // Virmanda KDV olmaz; § 19 küçük işletmede oran 0'a zorlanır.
            const taxRate = input.type === "TRANSFER" ? 0 : effectiveTaxRate(input.taxRate, await getTaxSettings(tx));

            const booking = await tx.accountingBooking.create({
              data: {
                year,
                sequence,
                bookingNumber,
                type: input.type,
                bookingDate,
                accountId: input.accountId,
                counterAccountId: input.type === "TRANSFER" ? input.counterAccountId : null,
                categoryId: input.type === "TRANSFER" ? null : input.categoryId,
                projectId: input.projectId ?? null,
                amount: toDecimal(cents),
                ...taxColumnsFromGross(cents, taxRate),
                description: input.description,
                counterparty: input.counterparty ?? null,
                receiptReference: input.receiptReference ?? null,
                createdById: user.id,
                createdByLabel,
                updatedById: user.id,
                updatedByLabel: createdByLabel,
              },
            });

            await assertNoNegativeCash(input.accountId, tx);
            if (input.type === "TRANSFER") {
              await assertNoNegativeCash(input.counterAccountId, tx);
            }

            return booking;
          }),
        );

        await audit({
          action: "CREATE",
          entity: "AccountingBooking",
          entityId: created.id,
          after: {
            bookingNumber: created.bookingNumber,
            type: created.type,
            amountCents: cents,
            bookingDate: created.bookingDate.toISOString().slice(0, 10),
            // Gizlilik (§ 12): description/counterparty içeriği audit'e yazılmaz.
          },
        });

        return { id: created.id, bookingNumber: created.bookingNumber };
      } catch (error) {
        ruleError(error);
      }
    },
  });

  return run(input) as Promise<ActionResult<{ id: string; bookingNumber: string }>>;
}

/**
 * Fiş güncelleme (§ 8 md. 6): tür değişmez; ters kayıt edilmiş, kilit yıllı ve
 * kaynak fişler düzenlenemez. Tutar/tarih/hesap değişirse Kassenminus yeni
 * değerlerle yeniden denetlenir (eski fiş etkisi hariç).
 */
export async function updateBookingAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: bookingUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const { bookingDate, cents } = parseCommon(input);
      const updatedByLabel = buildUserLabel(user.name, user.email);

      const existing = await db.accountingBooking.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("accounting.errors.bookingNotFound");

      if (existing.reversedAt) {
        throw new ActionError("accounting.errors.reversedNoEdit");
      }
      if (existing.sourceType) {
        throw new ActionError("accounting.errors.sourcedNoEdit");
      }

      const year = existing.year;
      const yearOfNewDate = berlinYear(bookingDate);
      if (yearOfNewDate !== year) {
        // KARAR: yıl değişikliği fiş numarası bütünlüğünü bozar → yasak; kullanıcı
        // yeni fiş oluşturup eskiyi ters kayıt eder (§ 8 md. 7 akışı).
        throw new ActionError(
          "accounting.errors.yearChangeForbidden",
          { bookingDate: ["accounting.errors.yearChangeField"] },
        );
      }

      if (existing.updatedAt.toISOString() !== input.updatedAt) {
        throw new ActionError("common.errors.staleRecord");
      }

      try {
        await db.$transaction(async (tx) => {
          const accountIds =
            existing.type === "TRANSFER"
              ? [input.accountId, input.counterAccountId ?? existing.counterAccountId ?? ""]
              : [input.accountId];
          await assertBookingDateAllowed({ bookingDate, year, accountIds, tx });

          if (existing.type === "TRANSFER") {
            if (input.categoryId) {
              throw new ActionError("accounting.errors.transferNoCategory", {
                categoryId: ["Virmanda kategori seçilmez."],
              });
            }
          } else if (input.categoryId) {
            await assertCategoryMatches(input.categoryId, existing.type, tx);
          }

          const taxRate = existing.type === "TRANSFER" ? 0 : effectiveTaxRate(input.taxRate, await getTaxSettings(tx));
          await tx.accountingBooking.update({
            where: { id: existing.id },
            data: {
              bookingDate,
              accountId: input.accountId,
              counterAccountId: existing.type === "TRANSFER" ? input.counterAccountId : null,
              categoryId: existing.type === "TRANSFER" ? null : input.categoryId,
              projectId: input.projectId ?? null,
              amount: toDecimal(cents),
              ...taxColumnsFromGross(cents, taxRate),
              description: input.description,
              counterparty: input.counterparty ?? null,
              receiptReference: input.receiptReference ?? null,
              updatedById: user.id,
              updatedByLabel,
            },
          });

          // Kassenminus: eski etkisini çıkar, yeni hareketi koy (§ 8 md. 9).
          if (existing.type === "TRANSFER") {
            await assertNoNegativeCashWithReplacement(
              input.accountId,
              tx,
              existing.id,
              {
                bookingDate,
                type: "TRANSFER",
                accountId: input.accountId,
                counterAccountId: input.counterAccountId,
                amountCents: cents,
              },
            );
            await assertNoNegativeCashWithReplacement(
              input.counterAccountId ?? input.accountId,
              tx,
              existing.id,
              {
                bookingDate,
                type: "TRANSFER",
                accountId: input.accountId,
                counterAccountId: input.counterAccountId,
                amountCents: cents,
              },
            );
          } else {
            await assertNoNegativeCashWithReplacement(
              input.accountId,
              tx,
              existing.id,
              {
                bookingDate,
                type: existing.type,
                accountId: input.accountId,
                counterAccountId: null,
                amountCents: cents,
              },
            );
          }
        });
      } catch (error) {
        ruleError(error);
      }

      await audit({
        action: "UPDATE",
        entity: "AccountingBooking",
        entityId: existing.id,
        before: { bookingNumber: existing.bookingNumber, amountCents: Number(existing.amount.mul(100).toFixed(0)) },
        after: { bookingNumber: existing.bookingNumber, amountCents: cents },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}

/**
 * Ters kayıt / Storno (§ 8 md. 7): sert silme YOK (DB tetikleyicisi de engeller).
 * Neden 5-300; kilit yıl ve kaynak fiş reddedilir; kasa kuralı korunur.
 */
export async function reverseBookingAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "delete" },
    schema: bookingReverseSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const label = buildUserLabel(user.name, user.email);

      const existing = await db.accountingBooking.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("accounting.errors.bookingNotFound");
      if (existing.reversedAt) {
        throw new ActionError("accounting.errors.alreadyReversed");
      }
      if (existing.sourceType) {
        throw new ActionError(
          "Kaynak fiş (otomatik) elle iptal edilemez; kaynak modülden yönetilir (üyelik aktarımı void'i ters kaydı yapar).",
        );
      }

      try {
        await db.$transaction(async (tx) => {
          const row = await tx.accountingYear.findUnique({ where: { year: existing.year } });
          if (row?.lockedAt) {
            throw new BookingRuleError(
              "accounting.errors.reverseYearLockedNumbered", undefined, { year: existing.year },
            );
          }

          await tx.accountingBooking.update({
            where: { id: existing.id },
            data: {
              reversedAt: new Date(),
              reversedById: user.id,
              reversedByLabel: label,
              reverseReason: input.reason,
            },
          });

          await assertNoNegativeCash(existing.accountId, tx);
          if (existing.type === "TRANSFER" && existing.counterAccountId) {
            await assertNoNegativeCash(existing.counterAccountId, tx);
          }
        });
      } catch (error) {
        ruleError(error);
      }

      await audit({
        action: "REVERSE",
        entity: "AccountingBooking",
        entityId: existing.id,
        before: { bookingNumber: existing.bookingNumber, reversedAt: null },
        after: { bookingNumber: existing.bookingNumber, reason: input.reason },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
