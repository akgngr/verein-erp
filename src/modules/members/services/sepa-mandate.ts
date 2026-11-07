import "server-only";

import { getDb } from "@/shared/db";

/** Üyenin SEPA yetkisi (detay kartı için). */
export async function getMemberMandate(memberId: string) {
  const row = await getDb().member.findFirst({
    where: { id: memberId, deletedAt: null },
    select: { membershipNumber: true, firstName: true, lastName: true, sepaIban: true, sepaBic: true, sepaAccountHolder: true, sepaMandateReference: true, sepaMandateDate: true },
  });
  if (!row) return null;
  return {
    ibanMasked: row.sepaIban ? `${row.sepaIban.slice(0, 4)} •••• •••• ${row.sepaIban.slice(-4)}` : null,
    bic: row.sepaBic,
    accountHolder: row.sepaAccountHolder,
    reference: row.sepaMandateReference,
    date: row.sepaMandateDate?.toISOString().slice(0, 10) ?? null,
    defaultReference: `M-${row.membershipNumber}`,
    defaultHolder: `${row.firstName} ${row.lastName}`.trim(),
  };
}
export type MemberMandate = NonNullable<Awaited<ReturnType<typeof getMemberMandate>>>;

export async function saveMemberMandate(memberId: string, input: { iban: string; bic: string | null; accountHolder: string; reference: string; date: string } | null) {
  await getDb().member.update({
    where: { id: memberId },
    data: input
      ? { sepaIban: input.iban, sepaBic: input.bic, sepaAccountHolder: input.accountHolder, sepaMandateReference: input.reference, sepaMandateDate: new Date(`${input.date}T00:00:00Z`) }
      : { sepaIban: null, sepaBic: null, sepaAccountHolder: null, sepaMandateReference: null, sepaMandateDate: null },
  });
}
