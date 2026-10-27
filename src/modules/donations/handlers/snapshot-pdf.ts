import "server-only";

import type { ZuwendungConfirmation, ZuwendungConfirmationItem } from "@prisma/client";

import type { AnlageItemRow, ConfirmationPdfData } from "../pdf/confirmation-document";
import type { RecipientSnapshot } from "../services/confirmation-builder";

/**
 * DEPOLANMIŞ snapshot → PDF verisi (§ 13 batch + yeniden üretim YOK): tüm
 * veri DB'deki değişmez kolonlardan gelir — deterministik çıktı (§ 13 md. 3).
 */
export async function storedSnapshotToPdfData(
  confirmation: ZuwendungConfirmation & { items: ZuwendungConfirmationItem[] },
  items: AnlageItemRow[],
): Promise<ConfirmationPdfData> {
  const issuer = confirmation.issuerSnapshot as Record<string, unknown>;
  const recipient: RecipientSnapshot = {
    kind: confirmation.donorId ? "donor" : "member",
    name: confirmation.recipientName,
    street: confirmation.recipientStreet,
    postalCode: confirmation.recipientPostalCode,
    city: confirmation.recipientCity,
    country: confirmation.recipientCountry,
  };

  return {
    organization: {
      name: String(issuer.name ?? ""),
      street: (issuer.street as string | null) ?? null,
      postalCode: (issuer.postalCode as string | null) ?? null,
      city: (issuer.city as string | null) ?? null,
      taxNumber: (issuer.taxNumber as string | null) ?? null,
      taxOffice: (issuer.taxOffice as string | null) ?? null,
    },
    confirmationNumber: confirmation.confirmationNumber,
    isPreview: false,
    kind: confirmation.kind,
    content: confirmation.content,
    recipient,
    totalCents: Number(confirmation.totalAmount.mul(100).toFixed(0)),
    amountInWords: confirmation.amountInWords,
    periodFrom: confirmation.periodFrom,
    periodTo: confirmation.periodTo,
    waived: confirmation.waivedReimbursement,
    membershipFeesDeductible: Boolean(issuer.membershipFeesDeductible),
    items,
    issuedPlace: confirmation.issuedPlace,
    issueDate: confirmation.issuedAt,
    attachment: confirmation.kind === "COLLECTIVE",
    issuerSnapshotData: issuer,
  };
}
