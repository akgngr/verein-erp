import "server-only";

import { getDb } from "@/shared/db";
import { maskIban, normalizeIban } from "@/shared/finance/iban";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import type { ProfileData, ProfileInput } from "../schemas/profile";

const PURPOSE = "user-profile";


const empty = (value: string | null | undefined) => value ?? "";

export async function getProfileView(userId: string): Promise<ProfileData> {
  const row = await getDb().userProfile.findUnique({ where: { userId } });
  const iban = row?.ibanEnc ? openSecret(PURPOSE, row.ibanEnc) : null;
  const taxNumber = row?.taxNumberEnc ? openSecret(PURPOSE, row.taxNumberEnc) : null;
  return {
    phone: empty(row?.phone),
    mobile: empty(row?.mobile),
    street: empty(row?.street),
    houseNumber: empty(row?.houseNumber),
    postalCode: empty(row?.postalCode),
    city: empty(row?.city),
    country: row?.country ?? "DE",
    accountHolder: empty(row?.accountHolder),
    bic: empty(row?.bic),
    bankName: empty(row?.bankName),
    businessName: empty(row?.businessName),
    vatId: empty(row?.vatId),
    isSmallBusiness: row?.isSmallBusiness ?? false,
    ibanMasked: iban ? maskIban(iban) : null,
    taxNumberMasked: taxNumber ? `•••• ${taxNumber.slice(-3)}` : null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<{ ibanChanged: boolean; taxNumberChanged: boolean }> {
  const nullIfEmpty = (value: string) => (value.trim() ? value.trim() : null);
  const ibanUpdate = input.clearIban ? { ibanEnc: null } : input.iban ? { ibanEnc: sealSecret(PURPOSE, normalizeIban(input.iban)) } : {};
  const taxUpdate = input.clearTaxNumber ? { taxNumberEnc: null } : input.taxNumber ? { taxNumberEnc: sealSecret(PURPOSE, input.taxNumber.trim()) } : {};
  const data = {
    phone: nullIfEmpty(input.phone),
    mobile: nullIfEmpty(input.mobile),
    street: nullIfEmpty(input.street),
    houseNumber: nullIfEmpty(input.houseNumber),
    postalCode: nullIfEmpty(input.postalCode),
    city: nullIfEmpty(input.city),
    country: nullIfEmpty(input.country.toUpperCase()),
    accountHolder: nullIfEmpty(input.accountHolder),
    bic: nullIfEmpty(input.bic.toUpperCase()),
    bankName: nullIfEmpty(input.bankName),
    businessName: nullIfEmpty(input.businessName),
    vatId: nullIfEmpty(input.vatId.replace(/\s+/g, "").toUpperCase()),
    isSmallBusiness: input.isSmallBusiness,
    ...ibanUpdate,
    ...taxUpdate,
  };
  await getDb().userProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  return { ibanChanged: "ibanEnc" in ibanUpdate, taxNumberChanged: "taxNumberEnc" in taxUpdate };
}

/**
 * Ödeme ve fatura için profil (başka modüller, ör. öğretmene ödeme): IBAN ve vergi numarası
 * çözülmüş hâlde döner. Çağıran kendi yetki denetimini yapmalı ve erişimi denetim kaydına yazmalıdır.
 */
export async function getPaymentProfile(userId: string): Promise<{ accountHolder: string | null; iban: string | null; bic: string | null; businessName: string | null; taxNumber: string | null; vatId: string | null; isSmallBusiness: boolean } | null> {
  const row = await getDb().userProfile.findUnique({ where: { userId } });
  if (!row) return null;
  return {
    accountHolder: row.accountHolder,
    iban: row.ibanEnc ? openSecret(PURPOSE, row.ibanEnc) : null,
    bic: row.bic,
    businessName: row.businessName,
    taxNumber: row.taxNumberEnc ? openSecret(PURPOSE, row.taxNumberEnc) : null,
    vatId: row.vatId,
    isSmallBusiness: row.isSmallBusiness,
  };
}
