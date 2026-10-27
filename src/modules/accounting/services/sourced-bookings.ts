import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import { centsToDecimalString } from "@/shared/money";

import { PAYMENT_METHOD_ACCOUNT } from "../constants";
import { allocateBookingNumber } from "./booking-number";
import { assertBookingDateAllowed, isYearLocked } from "./booking-guards";
import { assertNoNegativeCash } from "./balances";

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
      throw new Error(`${year} yılı kilitli (abgeschlossen); fiş girilemez.`);
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
      throw new Error("Kategori bulunamadı veya fiş türüyle uyuşmuyor.");
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
      throw new Error(
        `${booking.year} yılı kilitli; ters kayıt için yıl kilidini açın.`,
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
  const settings = await db.accountingSettings.findUnique({ where: { id: "singleton" } });
  const missing: string[] = [];
  const donationCategoryId = settings?.donationCategoryId ?? null;
  const cashId = settings?.cashAccountId ?? null;
  const bankId = settings?.bankAccountId ?? null;
  if (donationCategoryId === null) missing.push("bağış kategorisi");
  if (cashId === null) missing.push("kasa hesabı");
  if (bankId === null) missing.push("banka hesabı");
  if (missing.length > 0) {
    throw new Error(
      `Muhasebe ayarları eksik: ${missing.join(", ")}. Muhasebe > Üyelik aktarımı sayfasından tamamlayın.`,
    );
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
    missing.push("geçerli bağış kategorisi");
  }
  if (!cash || !cash.isActive) missing.push("geçerli kasa hesabı");
  if (!bank || !bank.isActive) missing.push("geçerli banka hesabı");
  if (missing.length > 0) {
    throw new Error(`Muhasebe ayarları geçersiz: ${missing.join(", ")}.`);
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
