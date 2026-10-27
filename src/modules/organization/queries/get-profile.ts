import "server-only";

import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";

import type { OrganizationUpdateInput } from "../schemas/profile";

/**
 * Dernek ana verilerinin görüntü tipi. Veritabanı satırı ya da profil henüz
 * kaydedilmemişse ORGANIZATION_NAME fallback'inden üretilen nesne taşınır.
 */
export type OrganizationProfileData = {
  exists: boolean; // veritabanında kayıt var mı (dashboard banner'ı buna bakar)
  name: string;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  registerCourt: string | null;
  registerNumber: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  exemptionNoticeDate: Date | null;
  exemptionNoticePeriod: string | null;
  /** Faz 5 (§ 4): muafiyet belgesi türü + amaç metni + aidat indirilebilirliği. */
  exemptionDocumentType: "EXEMPTION_NOTICE" | "TAX_ASSESSMENT_ANNEX" | "SPECIAL_ASSESSMENT_60A" | null;
  charitablePurposes: string | null;
  membershipFeesDeductible: boolean;
  /** Logo (kullanıcı isteği): yalnızca varlık bilgisi; dosya yolu sızdırılmaz. */
  hasLogo: boolean;
  /** Önizleme cache-bust sürümü (logoUpdatedAt ms). */
  logoVersion: string | null;
  logoOriginalName: string | null;
  updatedAt: Date | null;
};

/**
 * Tek satırlık profil kaydı; yoksa ORGANIZATION_NAME fallback'i ile döner (4.2).
 * PDF antetleri ve modüller profilin varlığını bu fonksiyon üzerinden okur.
 */
export async function getOrganizationProfile(): Promise<OrganizationProfileData> {
  const row = await getDb().organizationProfile.findUnique({ where: { id: "singleton" } });
  if (row) {
    return {
      ...row,
      exists: true,
      hasLogo: Boolean(row.logoPath && row.logoMime),
      logoVersion: row.logoUpdatedAt ? String(row.logoUpdatedAt.getTime()) : null,
      logoOriginalName: row.logoOriginalName,
    };
  }

  return {
    exists: false,
    name: getEnv().ORGANIZATION_NAME,
    street: null,
    postalCode: null,
    city: null,
    country: null,
    email: null,
    phone: null,
    website: null,
    registerCourt: null,
    registerNumber: null,
    taxNumber: null,
    taxOffice: null,
    exemptionNoticeDate: null,
    exemptionNoticePeriod: null,
    exemptionDocumentType: null,
    charitablePurposes: null,
    membershipFeesDeductible: false,
    hasLogo: false,
    logoVersion: null,
    logoOriginalName: null,
    updatedAt: null,
  };
}

/** Şema girişini veritabanı güncellemesine çevirir (tarih alanı Date'e döner). */
export function toProfileDbData(input: OrganizationUpdateInput) {
  return {
    name: input.name,
    street: input.street,
    postalCode: input.postalCode,
    city: input.city,
    country: input.country ?? "Deutschland",
    email: input.email,
    phone: input.phone,
    website: input.website,
    registerCourt: input.registerCourt,
    registerNumber: input.registerNumber,
    taxNumber: input.taxNumber,
    taxOffice: input.taxOffice,
    exemptionNoticeDate: input.exemptionNoticeDate ? new Date(`${input.exemptionNoticeDate}T00:00:00Z`) : null,
    exemptionNoticePeriod: input.exemptionNoticePeriod,
    exemptionDocumentType: input.exemptionDocumentType,
    charitablePurposes: input.charitablePurposes,
    membershipFeesDeductible: input.membershipFeesDeductible,
  };
}
