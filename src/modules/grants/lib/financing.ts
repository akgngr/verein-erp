import type { GrantFinancingType } from "@prisma/client";

export const FINANCING_TYPES = ["FEHLBEDARF", "ANTEIL", "FESTBETRAG"] as const;

export function computeNeededGrantCents(input: {
  financingType: GrantFinancingType;
  sharePercent: number | null;
  approvedCents: number | null;
  actualTotalCents: number;
  ownShareCents: number;
  thirdPartyCents: number;
  otherIncomeCents: number;
}): number {
  // Net expenses can be negative (supplier refunds booked as negative EXPENSE); no financing
  // type may then turn into a negative requirement, i.e. a phantom overpayment.
  const expenses = Math.max(0, input.actualTotalCents);
  if (input.financingType === "ANTEIL") {
    const pct = Math.min(100, Math.max(0, input.sharePercent ?? 100));
    const share = Math.round((expenses * pct) / 100);
    return input.approvedCents !== null ? Math.min(share, input.approvedCents) : share;
  }
  if (input.financingType === "FESTBETRAG") {
    return input.approvedCents !== null ? Math.min(input.approvedCents, expenses) : expenses;
  }
  return Math.max(
    0,
    input.actualTotalCents - input.ownShareCents - input.thirdPartyCents - input.otherIncomeCents,
  );
}
