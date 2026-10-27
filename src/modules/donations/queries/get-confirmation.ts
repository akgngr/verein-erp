import "server-only";

import { getDb } from "@/shared/db";
import { getPaymentStatuses } from "@/modules/members/server";

import { retentionEndDate } from "../services/issue-guards";
import type { ConfirmationDetail } from "../types";

/** Bildirim detayı (§ 15 md. 7) + void ödeme uyarısı (§ 11 md. 11). */
export async function getConfirmation(id: string): Promise<ConfirmationDetail | null> {
  const db = getDb();
  const confirmation = await db.zuwendungConfirmation.findUnique({
    where: { id },
    include: {
      donor: { select: { donorNumber: true } },
      replacedBy: { select: { id: true, confirmationNumber: true } },
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!confirmation) return null;

  const memberPaymentItems = confirmation.items.filter(
    (item) => item.itemType === "MEMBER_PAYMENT",
  );
  const statuses = await getPaymentStatuses(memberPaymentItems.map((item) => item.sourceId));
  const voidedIds = new Set(statuses.filter((status) => status.voidedAt).map((status) => status.id));
  const voidedReceipts = await db.memberPayment.findMany({
    where: { id: { in: [...voidedIds] } },
    select: { id: true, receiptNumber: true },
  });

  return {
    id: confirmation.id,
    confirmationNumber: confirmation.confirmationNumber,
    issuedAt: confirmation.issuedAt,
    kind: confirmation.kind,
    content: confirmation.content,
    recipientName: confirmation.recipientName,
    totalCents: Number(confirmation.totalAmount.mul(100).toFixed(0)),
    status: confirmation.status,
    voidedPaymentWarning: memberPaymentItems.some((item) => voidedIds.has(item.sourceId)),
    year: confirmation.year,
    sequence: confirmation.sequence,
    donorNumber: confirmation.donor?.donorNumber ?? null,
    memberId: confirmation.memberId,
    recipientStreet: confirmation.recipientStreet,
    recipientPostalCode: confirmation.recipientPostalCode,
    recipientCity: confirmation.recipientCity,
    recipientCountry: confirmation.recipientCountry,
    periodFrom: confirmation.periodFrom,
    periodTo: confirmation.periodTo,
    amountInWords: confirmation.amountInWords,
    waivedReimbursement: confirmation.waivedReimbursement,
    issuerSnapshot: confirmation.issuerSnapshot as Record<string, unknown>,
    templateVersion: confirmation.templateVersion,
    issuedPlace: confirmation.issuedPlace,
    issuedByLabel: confirmation.issuedByLabel,
    cancelledAt: confirmation.cancelledAt,
    cancelledByLabel: confirmation.cancelledByLabel,
    cancelReason: confirmation.cancelReason,
    replacesId: confirmation.replacesId,
    replacedById: confirmation.replacedBy[0]?.id ?? null,
    pdfStoragePath: confirmation.pdfStoragePath,
    pdfSha256: confirmation.pdfSha256,
    pdfSize: confirmation.pdfSize,
    items: confirmation.items.map((item) => ({
      id: item.id,
      position: item.position,
      itemType: item.itemType,
      sourceId: item.sourceId,
      itemDate: item.itemDate,
      amountCents: Number(item.amount.mul(100).toFixed(0)),
      label: item.label,
      waived: item.waived,
    })),
    voidedPayments: voidedReceipts.map((payment) => ({
      sourceId: payment.id,
      receiptNumber: payment.receiptNumber,
    })),
    retentionEndDate: retentionEndDate(confirmation.issuedAt),
  };
}
