import "server-only";

import { getMessageTranslator } from "@/shared/i18n/translate-message";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import { centsToDecimalString } from "@/shared/money";

import { PAYMENT_METHOD_ACCOUNT } from "../constants";
import { allocateBookingNumber } from "./booking-number";
import { assertBookingDateAllowed, isYearLocked } from "./booking-guards";
import { assertNoNegativeCash } from "./balances";
import { ActionError } from "@/modules/auth/server";

/**
 * Faz 5 (§ 6): bağış modülünün kullanacağı servis düzeyi fiş API'si.
 * Çağıran iznini denetlemiş olmalıdır; iş kuralları (yıl kilidi, açılış tarihi,
 * kasa kuralı, numaralandırma, benzersizlik) BURADA uygulanır.
 */

export type SourcedBookingInput = {
  tx?: Prisma.TransactionClient;
  actor: { id: string; label: string };
  type: "INCOME" | "EXPENSE";
  /** "DONATION" | "DONATION_WAIVER" (Faz 5) — unique([sourceType, sourceId]). */
  sourceType: string;
  sourceId: string;
  bookingDate: Date;
  accountId: string;
  categoryId: string;
  amountCents: number;
  description: string;
  receiptReference?: string | null;
};

/**
 * Kaynak bağlı fiş oluşturur (§ 6): bağış kaydının transaction'ında `tx` ile
 * çağrılır; tx yoksa kendi transaction'ını açar. Yıl kilidi, açılış tarihi,
 * kasa kuralı ve numara üretimi createBookingAction ile AYNI kurallardır.
 * @@unique([sourceType, sourceId]) çakışmasında P2002 dışarı sızar (çağıran
 * kendi retry akışını yönetir; KARAR: bağış numarası sayaçları zaten P2002
 * retry'lı — çift fiş oluşamaz).
 */
export async function createSourcedBooking(
  input: SourcedBookingInput,
): Promise<{ id: string; bookingNumber: string }> {
  const run = async (tx: Prisma.TransactionClient): Promise<{ id: string; bookingNumber: string }> => {
    const year = input.bookingDate.getUTCFullYear();
    if (await isYearLocked(year, tx)) {
      throw new ActionError("accounting.errors.yearLocked", undefined, { year });
    }
    await assertBookingDateAllowed({
      bookingDate: input.bookingDate,
      year,
      accountIds: [input.accountId],
      tx,
    });
    const category = await tx.accountingCategory.findUnique({
      where: { id: input.categoryId },
      select: { isActive: true, direction: true },
    });
    if (!category || !category.isActive || category.direction !== input.type) {
      throw new ActionError("accounting.errors.categoryMismatch");
    }

    const { sequence, bookingNumber } = await allocateBookingNumber(tx, year);
    const created = await tx.accountingBooking.create({
      data: {
        year,
        sequence,
        bookingNumber,
        type: input.type,
        bookingDate: input.bookingDate,
        accountId: input.accountId,
        categoryId: input.categoryId,
        amount: centsToDecimalString(input.amountCents),
        description: input.description,
        receiptReference: input.receiptReference ?? null,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdById: input.actor.id,
        createdByLabel: input.actor.label,
        updatedById: input.actor.id,
        updatedByLabel: input.actor.label,
      },
    });
    await assertNoNegativeCash(input.accountId, tx);
    return { id: created.id, bookingNumber: created.bookingNumber };
  };

  if (input.tx) return run(input.tx);
  return getDb().$transaction(run);
}

/**
 * Kaynak bağlı fişin ters kaydı (§ 6): idempotent — fiş yoksa veya zaten ters
 * kayıtlıysa no-op. Yıl kilitliyse HATA (bağış iptali engellenir; kullanıcı
 * kilidi açar). Elle ters kayıt (reverseBookingAction) sourceType'lı fişleri
 * zaten reddeder; bu fonksiyon tek yetkili yoldur.
 */
export async function reverseSourcedBooking(input: {
  tx?: Prisma.TransactionClient;
  actor: { id: string; label: string };
  sourceType: string;
  sourceId: string;
  reason: string;
}): Promise<void> {
  const run = async (tx: Prisma.TransactionClient): Promise<void> => {
    const booking = await tx.accountingBooking.findFirst({
      where: { sourceType: input.sourceType, sourceId: input.sourceId },
      select: { id: true, reversedAt: true, year: true },
    });
    if (!booking || booking.reversedAt) return; // idempotent no-op

    if (await isYearLocked(booking.year, tx)) {
      throw new ActionError(
        "accounting.errors.reverseYearLockedYear", undefined, { year: booking.year },
      );
    }
    await tx.accountingBooking.update({
      where: { id: booking.id },
      data: {
        reversedAt: new Date(),
        reversedById: input.actor.id,
        reversedByLabel: input.actor.label,
        reverseReason: input.reason,
      },
    });
  };

  if (input.tx) return run(input.tx);
  return getDb().$transaction(run);
}

/** Bağış fiş hedefleri (§ 6): settings'te eksik varsa TÜRKÇE hata — ne eksikse adıyla. */
export async function getDonationBookingTargets(): Promise<{
  donationCategoryId: string;
  cashAccountId: string;
  bankAccountId: string;
}> {
  const db = getDb();
  const translate = await getMessageTranslator();
  const settings = await db.accountingSettings.findUnique({ where: { id: "singleton" } });
  const missing: string[] = [];
  const donationCategoryId = settings?.donationCategoryId ?? null;
  const cashId = settings?.cashAccountId ?? null;
  const bankId = settings?.bankAccountId ?? null;
  if (donationCategoryId === null) missing.push(translate("accounting.errors.itemDonationCategory"));
  if (cashId === null) missing.push(translate("accounting.errors.itemCashAccount"));
  if (bankId === null) missing.push(translate("accounting.errors.itemBankAccount"));
  if (missing.length > 0) {
    throw new ActionError("accounting.errors.settingsMissing", undefined, { missing: missing.join(", ") });
  }

  // Yukarıdaki atış (throw) sonrası üç id de null olamaz (KARAR: açık denetim).
  const [category, cash, bank] = await Promise.all([
    db.accountingCategory.findUnique({
      where: { id: donationCategoryId! },
      select: { isActive: true, direction: true },
    }),
    db.accountingAccount.findUnique({
      where: { id: cashId! },
      select: { isActive: true },
    }),
    db.accountingAccount.findUnique({
      where: { id: bankId! },
      select: { isActive: true },
    }),
  ]);
  if (!category || !category.isActive || category.direction !== "INCOME") {
    missing.push(translate("accounting.errors.itemValidDonationCategory"));
  }
  if (!cash || !cash.isActive) missing.push(translate("accounting.errors.itemValidCashAccount"));
  if (!bank || !bank.isActive) missing.push(translate("accounting.errors.itemValidBankAccount"));
  if (missing.length > 0) {
    throw new ActionError("accounting.errors.settingsInvalid", undefined, { missing: missing.join(", ") });
  }

  // Yukarıdaki null denetimleri sonrası üç alan da string'tir.
  return {
    donationCategoryId: donationCategoryId as string,
    cashAccountId: cashId as string,
    bankAccountId: bankId as string,
  };
}

/** Ödeme yöntemine göre hedef hesap anahtarı (bağış akışı; § 11 md. 5). */
export function donationAccountKeyFor(method: string): "cashAccountId" | "bankAccountId" {
  return PAYMENT_METHOD_ACCOUNT[method as keyof typeof PAYMENT_METHOD_ACCOUNT] ?? "bankAccountId";
}

/** Aktif kategori seçenekleri (§ 6): bağış formu gider kategorisi seçimi için. */
export async function listActiveCategoryOptions(
  direction: "INCOME" | "EXPENSE",
): Promise<Array<{ id: string; name: string; sphere: string }>> {
  const rows = await getDb().accountingCategory.findMany({
    where: { isActive: true, direction },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sphere: true },
  });
  return rows;
}

/**
 * Genel tahsilat hedefleri (kurs ücretleri vb.): ayarlardaki kasa ve banka hesabı.
 * Eksik ya da pasifse ne eksikse adıyla hata verir (bağış hedefleriyle aynı denetim).
 */
export async function getPaymentAccountTargets(): Promise<{ cashAccountId: string; bankAccountId: string }> {
  const db = getDb();
  const translate = await getMessageTranslator();
  const settings = await db.accountingSettings.findUnique({ where: { id: "singleton" } });
  const missing: string[] = [];
  if (!settings?.cashAccountId) missing.push(translate("accounting.errors.itemCashAccount"));
  if (!settings?.bankAccountId) missing.push(translate("accounting.errors.itemBankAccount"));
  if (missing.length > 0) {
    throw new ActionError("accounting.errors.settingsMissing", undefined, { missing: missing.join(", ") });
  }
  const [cash, bank] = await Promise.all([
    db.accountingAccount.findUnique({ where: { id: settings!.cashAccountId! }, select: { isActive: true } }),
    db.accountingAccount.findUnique({ where: { id: settings!.bankAccountId! }, select: { isActive: true } }),
  ]);
  if (!cash?.isActive) missing.push(translate("accounting.errors.itemValidCashAccount"));
  if (!bank?.isActive) missing.push(translate("accounting.errors.itemValidBankAccount"));
  if (missing.length > 0) {
    throw new ActionError("accounting.errors.settingsInvalid", undefined, { missing: missing.join(", ") });
  }
  return { cashAccountId: settings!.cashAccountId!, bankAccountId: settings!.bankAccountId! };
}
