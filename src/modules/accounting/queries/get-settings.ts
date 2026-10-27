import "server-only";

import { getDb } from "@/shared/db";

/** Muhasebe ayarları (§ 11.7): id + ad anlık görüntüsüyle. */
export async function getSettings(): Promise<{
  memberFeeCategoryId: string | null;
  cashAccountId: string | null;
  bankAccountId: string | null;
  memberFeeCategoryName: string | null;
  cashAccountName: string | null;
  bankAccountName: string | null;
  /** Faz 5 (§ 6): bağış kategorisi. */
  donationCategoryId: string | null;
  donationCategoryName: string | null;
}> {
  const db = getDb();
  const settings = await db.accountingSettings.findUnique({
    where: { id: "singleton" },
    // KARAR: settings düz id taşır (modüller arası FK yok) — adları ayrı sorguyla al.
  });

  const [feeCategory, cashAccount, bankAccount, donationCategory] = await Promise.all([
    settings?.memberFeeCategoryId
      ? db.accountingCategory.findUnique({
          where: { id: settings.memberFeeCategoryId },
          select: { name: true },
        })
      : null,
    settings?.cashAccountId
      ? db.accountingAccount.findUnique({
          where: { id: settings.cashAccountId },
          select: { name: true },
        })
      : null,
    settings?.bankAccountId
      ? db.accountingAccount.findUnique({
          where: { id: settings.bankAccountId },
          select: { name: true },
        })
      : null,
    settings?.donationCategoryId
      ? db.accountingCategory.findUnique({
          where: { id: settings.donationCategoryId },
          select: { name: true },
        })
      : null,
  ]);

  return {
    memberFeeCategoryId: settings?.memberFeeCategoryId ?? null,
    cashAccountId: settings?.cashAccountId ?? null,
    bankAccountId: settings?.bankAccountId ?? null,
    memberFeeCategoryName: feeCategory?.name ?? null,
    cashAccountName: cashAccount?.name ?? null,
    bankAccountName: bankAccount?.name ?? null,
    donationCategoryId: settings?.donationCategoryId ?? null,
    donationCategoryName: donationCategory?.name ?? null,
  };
}
