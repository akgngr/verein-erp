import "server-only";

import { getMessageTranslator } from "@/shared/i18n/translate-message";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";

import { listPaymentsForAccounting } from "@/modules/members/server";

import { PAYMENT_METHOD_ACCOUNT } from "../constants";
import { allocateBookingNumber } from "./booking-number";
import { taxColumnsFromGross } from "./tax";
import { BookingRuleError } from "./booking-guards";
import { ActionError } from "@/modules/auth/server";

/**
 * Üyelik aktarımı (§ 8 md. 15): üyeler modülündeki ödemeleri deftere taşır.
 * KARAR: Fiş metninde üye NUMARASI geçer, asla ad (gizlilik kuralı — § 12).
 * İdempotent: @@unique([sourceType, sourceId]) sayesinde ikinci çalıştırma
 * yeni fiş üretmez. Void edilen ödemenin fişi sonraki çalıştırmada ters kayıt edilir.
 */

/**
 * Bir ödemenin fişleri. KARAR (tutar düzeltmesi): yanlış tutarlı fiş silinmez; ters kaydedilir
 * ("Betragskorrektur") ve doğru tutarla yeni fiş açılır. @@unique([sourceType, sourceId]) nedeniyle
 * sonraki fişler `<ödemeId>:<n>` kaynak kimliğiyle yazılır; hepsi aynı ödemeye aittir.
 */
type PaymentBooking = { id: string; sourceId: string | null; reversedAt: Date | null; bookingDate: Date; amount: { toString(): string } };

function groupBookingsByPayment(bookings: PaymentBooking[]): Map<string, PaymentBooking[]> {
  const map = new Map<string, PaymentBooking[]>();
  for (const booking of bookings) {
    if (!booking.sourceId) continue;
    const paymentId = booking.sourceId.split(":")[0];
    map.set(paymentId, [...(map.get(paymentId) ?? []), booking]);
  }
  return map;
}

const bookingCents = (booking: PaymentBooking) => Math.round(Number(booking.amount.toString()) * 100);
const nextSourceId = (paymentId: string, existing: PaymentBooking[]) => (existing.length === 0 ? paymentId : `${paymentId}:${existing.length + 1}`);

export type AccountingSettingsData = {
  memberFeeCategoryId: string | null;
  cashAccountId: string | null;
  bankAccountId: string | null;
};

/** Ayarlar eksikse açıklayan Türkçe hata döner (§ 8 md. 15 md. 1). */
export async function assertSyncConfigured(settings: AccountingSettingsData): Promise<void> {
  const translate = await getMessageTranslator();
  const missing: string[] = [];
  if (!settings.memberFeeCategoryId) missing.push(translate("accounting.errors.itemFeeCategory"));
  if (!settings.cashAccountId) missing.push(translate("accounting.errors.itemCashAccount"));
  if (!settings.bankAccountId) missing.push(translate("accounting.errors.itemBankAccount"));
  if (missing.length > 0) {
    throw new ActionError("accounting.errors.syncSettingsMissing", undefined, { missing: missing.join(", ") });
  }
}

/** Üyelik aktarımı önizlemesi (§ 8 md. 15 md. 3). */
export async function previewMemberSync(): Promise<{
  settings: AccountingSettingsData;
  configured: boolean;
  toImport: { count: number; totalCents: number };
  toReverse: { count: number; totalCents: number };
  /** Fiş tutarı ödemeyle tutmuyor → ters kayıt + doğru tutarla yeni fiş. */
  toCorrect: { count: number; totalCents: number };
  skippedLockedYear: number;
  skippedBeforeOpening: number;
  conflicts: Array<{ receiptNumber: string; reason: string }>;
}> {
  const db = getDb();
  const settingsRow = await db.accountingSettings.findUnique({ where: { id: "singleton" } });
  const settings: AccountingSettingsData = {
    memberFeeCategoryId: settingsRow?.memberFeeCategoryId ?? null,
    cashAccountId: settingsRow?.cashAccountId ?? null,
    bankAccountId: settingsRow?.bankAccountId ?? null,
  };
  const configured = Boolean(
    settings.memberFeeCategoryId && settings.cashAccountId && settings.bankAccountId,
  );

  const empty = {
    settings,
    configured,
    toImport: { count: 0, totalCents: 0 },
    toReverse: { count: 0, totalCents: 0 },
    toCorrect: { count: 0, totalCents: 0 },
    skippedLockedYear: 0,
    skippedBeforeOpening: 0,
    conflicts: [] as Array<{ receiptNumber: string; reason: string }>,
  };
  if (!configured) return empty;

  const payments = await listPaymentsForAccounting();

  // Var olan kaynak fişleri tek sorguda al (idempotans kontrolü).
  const existingBookings = await db.accountingBooking.findMany({
    where: { sourceType: "MEMBER_PAYMENT" },
    select: { id: true, sourceId: true, reversedAt: true, bookingDate: true, amount: true },
  });
  const bookingsByPayment = groupBookingsByPayment(existingBookings);

  const accounts = await db.accountingAccount.findMany({
    where: { id: { in: [settings.cashAccountId!, settings.bankAccountId!] } },
    select: { id: true, openingDate: true },
  });
  const minOpening = accounts.reduce(
    (min, account) => Math.min(min, account.openingDate.getTime()),
    Infinity,
  );

  let importCount = 0;
  let importTotal = 0;
  let reverseCount = 0;
  let reverseTotal = 0;
  let correctCount = 0;
  let correctTotal = 0;
  let skippedLockedYear = 0;
  let skippedBeforeOpening = 0;
  const translate = await getMessageTranslator();
  const conflicts: Array<{ receiptNumber: string; reason: string }> = [];

  for (const payment of payments) {
    const existing = (bookingsByPayment.get(payment.id) ?? []).find((booking) => !booking.reversedAt);

    if (!payment.voidedAt) {
      if (existing && bookingCents(existing) === payment.amountCents) continue; // zaten doğru aktarılmış
      if (existing) {
        correctCount += 1;
        correctTotal += payment.amountCents;
        if (await isLockedYear(existing.bookingDate.getUTCFullYear())) {
          conflicts.push({ receiptNumber: payment.receiptNumber, reason: translate("accounting.errors.reverseYearLocked") });
        }
        continue;
      }
      const year = new Date(`${payment.paidAt}T00:00:00.000Z`).getUTCFullYear();
      const locked = await isLockedYear(year);
      if (locked) {
        skippedLockedYear += 1;
        continue;
      }
      if (new Date(`${payment.paidAt}T00:00:00.000Z`).getTime() < minOpening) {
        skippedBeforeOpening += 1;
        continue;
      }
      importCount += 1;
      importTotal += payment.amountCents;
    } else {
      // Void edilmiş ödeme → aktif fiş ters kayıt edilecek.
      if (!existing || existing.reversedAt) continue;
      reverseCount += 1;
      reverseTotal += payment.amountCents;
      const bookingYear = existing.bookingDate.getUTCFullYear();
      if (await isLockedYear(bookingYear)) {
        conflicts.push({
          receiptNumber: payment.receiptNumber,
          reason: translate("accounting.errors.reverseYearLocked"),
        });
      }
    }
  }

  return {
    settings,
    configured,
    toImport: { count: importCount, totalCents: importTotal },
    toReverse: { count: reverseCount, totalCents: reverseTotal },
    toCorrect: { count: correctCount, totalCents: correctTotal },
    skippedLockedYear,
    skippedBeforeOpening,
    conflicts,
  };
}

async function isLockedYear(year: number): Promise<boolean> {
  const db = getDb();
  const row = await db.accountingYear.findUnique({ where: { year } });
  return row?.lockedAt != null;
}

/**
 * Üyelik aktarımını çalıştırır (§ 8 md. 15 md. 4): her parti TEK transaction;
 * kasa kuralı ihlali listeye konur, akış devam eder. İdempotent.
 */
export async function runMemberSync(
  actor: { id: string; label: string },
): Promise<{
  createdCount: number;
  reversedCount: number;
  skippedCount: number;
  conflicts: Array<{ receiptNumber: string; reason: string }>;
}> {
  const db = getDb();
  const settingsRow = await db.accountingSettings.findUnique({ where: { id: "singleton" } });
  const settings: AccountingSettingsData = {
    memberFeeCategoryId: settingsRow?.memberFeeCategoryId ?? null,
    cashAccountId: settingsRow?.cashAccountId ?? null,
    bankAccountId: settingsRow?.bankAccountId ?? null,
  };
  await assertSyncConfigured(settings);

  const payments = await listPaymentsForAccounting();
  const existingBookings = await db.accountingBooking.findMany({
    where: { sourceType: "MEMBER_PAYMENT" },
    select: { id: true, sourceId: true, reversedAt: true, bookingDate: true, amount: true },
  });
  const bookingsByPayment = groupBookingsByPayment(existingBookings);

  let createdCount = 0;
  let reversedCount = 0;
  let skippedCount = 0;
  const translate = await getMessageTranslator();
  const conflicts: Array<{ receiptNumber: string; reason: string }> = [];

  const { assertNoNegativeCash } = await import("./balances");

  for (const payment of payments) {
    const allBookings = bookingsByPayment.get(payment.id) ?? [];
    const existing = allBookings.find((booking) => !booking.reversedAt);

    if (!payment.voidedAt) {
      if (existing && bookingCents(existing) === payment.amountCents) continue;
      // Tutar tutmuyor: eski fiş ters kaydedilir (kilitli yılda yapılamaz → çakışma).
      if (existing && (await isLockedYear(existing.bookingDate.getUTCFullYear()))) {
        conflicts.push({ receiptNumber: payment.receiptNumber, reason: translate("accounting.errors.reverseYearLocked") });
        continue;
      }
      const paidAt = new Date(`${payment.paidAt}T00:00:00.000Z`);
      const year = paidAt.getUTCFullYear();
      if (await isLockedYear(year)) {
        skippedCount += 1;
        continue;
      }

      const accountKey = PAYMENT_METHOD_ACCOUNT[payment.method];
      const accountId =
        accountKey === "cashAccountId" ? settings.cashAccountId! : settings.bankAccountId!;

      try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
          // Hesap açılış tarihi kontrolü.
          const account = await tx.accountingAccount.findUniqueOrThrow({
            where: { id: accountId },
            select: { openingDate: true },
          });
          if (paidAt.getTime() < account.openingDate.getTime()) {
            throw new ActionError("accounting.errors.beforeOpening");
          }

          if (existing) {
            await tx.accountingBooking.update({
              where: { id: existing.id },
              data: {
                reversedAt: new Date(),
                reversedById: actor.id,
                reversedByLabel: actor.label,
                reverseReason: `Betragskorrektur: ${(bookingCents(existing) / 100).toFixed(2)} → ${(payment.amountCents / 100).toFixed(2)}`,
              },
            });
          }

          const { sequence, bookingNumber } = await allocateBookingNumber(tx, year);
          const description = `Mitgliedsbeitrag ${payment.dueYear} – Mitglied Nr. ${payment.memberNumber} – ${payment.receiptNumber}`;

          await tx.accountingBooking.create({
            data: {
              year,
              sequence,
              bookingNumber,
              type: "INCOME",
              bookingDate: paidAt,
              accountId,
              categoryId: settings.memberFeeCategoryId!,
              amount: (payment.amountCents / 100).toFixed(2),
              // Üye aidatı KDV'siz (ideeller Bereich).
              ...taxColumnsFromGross(payment.amountCents, 0),
              description,
              receiptReference: payment.receiptNumber,
              sourceType: "MEMBER_PAYMENT",
              sourceId: nextSourceId(payment.id, allBookings),
              createdById: actor.id,
              createdByLabel: actor.label,
              updatedById: actor.id,
              updatedByLabel: actor.label,
            },
          });

          await assertNoNegativeCash(accountId, tx);
        });
        createdCount += 1;
      } catch (error) {
        // Çakışma nedeni önizleme tablosunda gösterilir: anahtar mesaj burada çevrilir.
        const message = error instanceof Error ? error.message : "common.errors.unexpected";
        const values = error instanceof ActionError || error instanceof BookingRuleError ? error.values : undefined;
        conflicts.push({ receiptNumber: payment.receiptNumber, reason: translate(message, values) });
      }
    } else {
      if (!existing || existing.reversedAt) continue;
      const bookingYear = (
        await db.accountingBooking.findUniqueOrThrow({
          where: { id: existing.id },
          select: { bookingDate: true },
        })
      ).bookingDate.getUTCFullYear();
      if (await isLockedYear(bookingYear)) {
        conflicts.push({
          receiptNumber: payment.receiptNumber,
          reason: translate("accounting.errors.reverseYearLocked"),
        });
        continue;
      }

      await db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.accountingBooking.update({
          where: { id: existing.id },
          data: {
            reversedAt: new Date(),
            reversedById: actor.id,
            reversedByLabel: actor.label,
            reverseReason: `Quittung storniert: ${payment.voidReason ?? ""}`.trim(),
          },
        });
      });
      reversedCount += 1;
    }
  }

  return { createdCount, reversedCount, skippedCount, conflicts };
}

/** (Yardımcı) Tutar string'ini cent'e çevirir; hatalıysa hata fırlatır. */
export function parseAmountToCents(amount: string): number {
  const cents = toCents(amount);
  if (cents === null || cents <= 0) {
    throw new ActionError("accounting.errors.amountInvalid");
  }
  return cents;
}
