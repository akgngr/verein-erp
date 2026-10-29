import "server-only";

import type { Prisma } from "@prisma/client";

import { getOrganizationProfile } from "@/modules/organization/server";
import { amountToGermanWords } from "@/shared/german-number-words";

import { ITEM_LABELS } from "../constants";
import type { MemberAddressBlock } from "@/modules/members/server";
import { ActionError } from "@/modules/auth/server";

/**
 * Değişmez anlık görüntü oluşturucu (§ 11 md. 9 md. 5): recipient + issuer
 * snapshot + tutar (cent) + yazıyla tutar. Öge toplamı totalAmount'a eşit
 * OLMALI — builder içinde doğrulanır (§ 11 md. 9 son madde).
 */

export type RecipientSnapshot =
  | { kind: "donor"; name: string; street: string; postalCode: string; city: string; country: string | null }
  | { kind: "member"; name: string; street: string; postalCode: string; city: string; country: string | null };

export type ConfirmationBuild = {
  recipient: RecipientSnapshot;
  issuer: Record<string, unknown>;
  totalCents: number;
  amountInWords: string;
  items: Array<{
    position: number;
    itemType: "DONATION" | "MEMBER_PAYMENT";
    sourceId: string;
    itemDate: Date;
    amountCents: number;
    label: string;
    waived: boolean;
  }>;
};

/** Bağış ögesi girdisi (candidate-picker'dan gelen seçim). */
export type DonationItemInput = {
  sourceId: string;
  itemDate: Date;
  amountCents: number;
  waived: boolean;
};

/** Aidat ögesi girdisi (members servisi satırlarından). */
export type MemberFeeItemInput = {
  sourceId: string;
  itemDate: Date;
  amountCents: number;
};

/** Bağışçı alıcı anlık görüntüsü — adres eksikse açık hatayla reddeder (§ 11 md. 8). */
export function donorRecipient(donor: {
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  type: string;
}): RecipientSnapshot {
  const missing: string[] = [];
  const name =
    donor.type === "ORGANIZATION"
      ? donor.organizationName
      : [donor.firstName, donor.lastName].filter(Boolean).join(" ").trim() || null;
  if (!name) missing.push("alıcı adı");
  if (!donor.street) missing.push("Straße");
  if (!donor.postalCode) missing.push("PLZ");
  if (!donor.city) missing.push("şehir");
  if (missing.length > 0) {
    throw new ActionError(`Bildirim için alıcı verisi eksik: ${missing.join(", ")}`);
  }
  return {
    kind: "donor",
    name: name!,
    street: donor.street!,
    postalCode: donor.postalCode!,
    city: donor.city!,
    country: donor.country ?? "Deutschland",
  };
}

/** Üye alıcı anlık görüntüsü (§ 5 getMemberAddressBlock). */
export function memberRecipient(block: MemberAddressBlock): RecipientSnapshot {
  return {
    kind: "member",
    name: block.name,
    // KARAR: Adres alanları opsiyoneldir; makbuzda boş alan boş string görünür.
    street: block.street ?? "",
    postalCode: block.postalCode ?? "",
    city: block.city ?? "",
    country: block.country,
  };
}

/** Toplam doğrulaması + yazıyla tutar içeren değişmez build. */
export async function buildConfirmationSnapshot(
  tx: Prisma.TransactionClient,
  args: {
    recipient: RecipientSnapshot;
    items: Array<DonationItemInput | MemberFeeItemInput>;
    itemType: "DONATION" | "MEMBER_PAYMENT";
    waived: boolean;
  },
): Promise<ConfirmationBuild> {
  void tx;
  if (args.items.length === 0) {
    throw new ActionError("donations.errors.confirmationNeedsItem");
  }
  const totalCents = args.items.reduce((sum, item) => sum + item.amountCents, 0);
  if (totalCents <= 0) {
    throw new ActionError("Bildirim toplamı 0'dan büyük olmalıdır.");
  }

  const profile = await getOrganizationProfile();
  const issuer = {
    name: profile.name,
    street: profile.street,
    postalCode: profile.postalCode,
    city: profile.city,
    country: profile.country,
    taxNumber: profile.taxNumber,
    taxOffice: profile.taxOffice,
    exemptionDocumentType: profile.exemptionDocumentType,
    exemptionNoticeDate: profile.exemptionNoticeDate
      ? profile.exemptionNoticeDate.toISOString().slice(0, 10)
      : null,
    exemptionNoticePeriod: profile.exemptionNoticePeriod,
    charitablePurposes: profile.charitablePurposes,
    membershipFeesDeductible: profile.membershipFeesDeductible,
  };

  return {
    recipient: args.recipient,
    issuer,
    totalCents,
    amountInWords: amountToGermanWords(totalCents),
    items: args.items.map((item, index) => ({
      position: index + 1,
      itemType: args.itemType,
      sourceId: item.sourceId,
      itemDate: item.itemDate,
      amountCents: item.amountCents,
      label: ITEM_LABELS[args.itemType],
      waived: "waived" in item ? item.waived : args.waived,
    })),
  };
}
