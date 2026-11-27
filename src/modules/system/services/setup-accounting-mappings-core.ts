/**
 * #583: Kurulum sonrası varsayılan muhasebe eşlemelerinin planı (saf). Boş alanlar doldurulur, dolu olanlar
 * korunur. Kategori adları muhasebe hazır ayarındaki (VEREIN) adlardır.
 */
export const DEFAULT_CATEGORY_NAMES = { donation: "Spenden", memberFee: "Mitgliedsbeiträge" } as const;

type Settings = { memberFeeCategoryId: string | null; cashAccountId: string | null; bankAccountId: string | null; donationCategoryId: string | null };

/** Saf: hangi alanların hangi kayıtla doldurulacağı. */
export function planDefaultMappings(
  settings: Settings,
  accounts: Array<{ id: string; type: string }>,
  incomeCategories: Array<{ id: string; name: string }>,
): { next: Settings; filled: (keyof Settings)[] } {
  const byName = (name: string) => incomeCategories.find((category) => category.name === name)?.id ?? null;
  const next: Settings = {
    cashAccountId: settings.cashAccountId ?? accounts.find((account) => account.type === "CASH")?.id ?? null,
    bankAccountId: settings.bankAccountId ?? accounts.find((account) => account.type === "BANK")?.id ?? null,
    donationCategoryId: settings.donationCategoryId ?? byName(DEFAULT_CATEGORY_NAMES.donation),
    memberFeeCategoryId: settings.memberFeeCategoryId ?? byName(DEFAULT_CATEGORY_NAMES.memberFee),
  };
  const filled = (Object.keys(next) as (keyof Settings)[]).filter((key) => !settings[key] && next[key]);
  return { next, filled };
}
