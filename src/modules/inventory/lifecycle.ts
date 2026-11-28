import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** Stored in place of a deleted member's name on returned loans (the item history stays). */
export const ANONYMISED_BORROWER = "—";

/**
 * DSGVO Art. 17: when a member is deleted, loans no longer point to them, and returned loans lose
 * the borrower's name. An open loan keeps the name while the item is still out, because the club
 * needs it to get the item back (Art. 6(1)(f)); it is anonymised once the loan is returned.
 */
export async function anonymiseMemberLoans(memberId: string): Promise<{ anonymised: number; unlinked: number }> {
  const db = getDb();
  const anonymised = await db.inventoryLoan.updateMany({
    where: { borrowerMemberId: memberId, returnedAt: { not: null } },
    data: { borrowerName: ANONYMISED_BORROWER, borrowerMemberId: null },
  });
  const unlinked = await db.inventoryLoan.updateMany({
    where: { borrowerMemberId: memberId },
    data: { borrowerMemberId: null },
  });
  return { anonymised: anonymised.count, unlinked: unlinked.count };
}

export const lifecycle = defineLifecycle({
  moduleKey: "inventory",
  onMemberDeleted: async (memberId) => {
    await anonymiseMemberLoans(memberId);
  },
});
