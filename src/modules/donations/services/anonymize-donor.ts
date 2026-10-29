import "server-only";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";

import { retentionEndDate } from "./issue-guards";
import { ActionError } from "@/modules/auth/server";

/**
 * Bağışçı anonimleştirme (§ 11 md. 12): ad, kuruluş adı, adres, e-posta,
 * telefon, not ve memberId temizlenir; bağışçı numarası ve bağış kayıtları
 * KALIR. Engeller: aktif (süresi geçmemiş) bildirim nüshası saklama süresi
 * içinde olan bağışçı; o dönemde iptal edilmemiş bağışlı aktif bildirim.
 */
export async function anonymizeDonor(
  donorId: string,
  actor: { id: string; label: string },
): Promise<void> {
  const db = getDb();
  const donor = await db.donor.findUnique({
    where: { id: donorId },
    select: { id: true, donorNumber: true, isAnonymized: true },
  });
  if (!donor) throw new ActionError("Bağışçı bulunamadı.");
  if (donor.isAnonymized) throw new ActionError("Bu bağışçı zaten anonimleştirilmiş.");

  const now = new Date();

  // Engeli A: süresi geçmemiş ISSUED bildirim (nüsha saklama süresi).
  const issuedConfirmations = await db.zuwendungConfirmation.findMany({
    where: { donorId, status: "ISSUED" },
    select: { issuedAt: true },
  });
  const blockedByRetention = issuedConfirmations.some(
    (confirmation) => retentionEndDate(confirmation.issuedAt).getTime() > now.getTime(),
  );
  if (blockedByRetention) {
    throw new ActionError(
      `Bu bağışçının bildirim nüshaları saklama süresi içinde (${issuedConfirmations.length} bildirim). Saklama süresi bitmeden anonimleştirilemez.`,
    );
  }

  // Engeli B: aktif bildirim ögesi olan, ters kayıt edilmemiş bağış.
  const activeItems = await db.zuwendungConfirmationItem.findMany({
    where: { activeKey: { not: null }, itemType: "DONATION" },
    select: { sourceId: true },
  });
  const activeSourceIds = new Set(activeItems.map((item) => item.sourceId));
  if (activeSourceIds.size > 0) {
    const blockingDonation = await db.donation.findFirst({
      where: { donorId, reversedAt: null, id: { in: [...activeSourceIds] } },
      select: { donationNumber: true },
    });
    if (blockingDonation) {
      throw new ActionError(
        `Bağışçıya ait aktif bildirimli bağış var (${blockingDonation.donationNumber}); önce bildirimi iptal edin.`,
      );
    }
  }

  await db.donor.update({
    where: { id: donorId },
    data: {
      firstName: null,
      lastName: null,
      organizationName: null,
      street: null,
      postalCode: null,
      city: null,
      country: null,
      email: null,
      phone: null,
      note: null,
      memberId: null,
      isAnonymized: true,
      anonymizedAt: now,
      updatedById: actor.id,
      updatedByLabel: buildUserLabel(actor.label, ""),
    },
  });
}
