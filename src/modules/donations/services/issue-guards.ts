import "server-only";

import { TEMPLATE_VERSION } from "../pdf/template-de";
import { CONFIRMATION_RETENTION_YEARS } from "../constants";
import { getOrganizationProfile } from "@/modules/organization/server";
import { getDb } from "@/shared/db";
import { getMessageTranslator } from "@/shared/i18n/translate-message";

/**
 * Üretim guard'ları (§ 11 md. 8): her üretimden ÖNCE çağrılır; EKSİK TÜM
 * kalemler tek hatada listelenir (§ 18 kabul: "ALL missing items are listed").
 */

export type IssueContent = "DONATION" | "MEMBERSHIP_FEE";

export class ReadinessError extends Error {
  readonly items: string[];
  constructor(items: string[]) {
    super(items.join(" "));
    this.items = items;
  }
}

/** Muafiyet geçerlilik penceresi (§ 63 Abs. 5 AO): Freistellung/Anlage 5 yıl, § 60a 3 yıl. */
export function exemptionValidityYears(
  exemptionDocumentType: string | null | undefined,
): number | null {
  if (exemptionDocumentType === "SPECIAL_ASSESSMENT_60A") return 3;
  if (exemptionDocumentType === "EXEMPTION_NOTICE" || exemptionDocumentType === "TAX_ASSESSMENT_ANNEX") {
    return 5;
  }
  return null;
}

/** Hazırlık raporu (§ 15 md. 8 ayarlar sayfası; her kalem ✓/✗ + düzeltme bağlantısı). */
export async function getReadiness(issueDate: Date): Promise<{
  canIssueDonation: boolean;
  canIssueMembershipFee: boolean;
  items: Array<{
    key: string;
    ok: boolean;
    label: string;
    fixHref: string | null;
    daysRemaining: number | null;
  }>;
}> {
  const db = getDb();
  // Etiketler isteğin dilinde üretilir (ayarlar sayfası, sihirbaz ve ReadinessError aynı metni gösterir).
  const t = await getMessageTranslator();
  const r = (key: string, values?: Record<string, string | number>) => t(`donations.readiness.${key}`, values);
  const [profile, settings] = await Promise.all([
    getOrganizationProfile(),
    db.donationsSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const items: Array<{
    key: string;
    ok: boolean;
    label: string;
    fixHref: string | null;
    daysRemaining: number | null;
  }> = [];

  // 1) Dernek profili alanları.
  const missingProfile: string[] = [];
  if (!profile.name) missingProfile.push(r("fieldName"));
  if (!profile.street) missingProfile.push(r("fieldStreet"));
  if (!profile.postalCode) missingProfile.push(r("fieldPostalCode"));
  if (!profile.city) missingProfile.push(r("fieldCity"));
  if (!profile.taxNumber) missingProfile.push(r("fieldTaxNumber"));
  if (!profile.taxOffice) missingProfile.push(r("fieldTaxOffice"));
  if (!profile.exemptionDocumentType) missingProfile.push(r("fieldDocumentType"));
  if (!profile.exemptionNoticeDate) missingProfile.push(r("fieldDocumentDate"));
  if (!profile.charitablePurposes) missingProfile.push(r("fieldPurposes"));
  if (!profile.exemptionNoticePeriod && profile.exemptionDocumentType !== "SPECIAL_ASSESSMENT_60A") {
    missingProfile.push(r("fieldPeriod"));
  }
  items.push({
    key: "organization",
    ok: missingProfile.length === 0,
    label:
      missingProfile.length === 0
        ? r("orgComplete")
        : r("orgMissing", { fields: missingProfile.join(", ") }),
    fixHref: missingProfile.length === 0 ? null : "/ayarlar/dernek",
    daysRemaining: null,
  });

  // 2) Geçerlilik (§ 63 Abs. 5 AO).
  let daysRemaining: number | null = null;
  let validityOk = false;
  const years = exemptionValidityYears(profile.exemptionDocumentType);
  if (profile.exemptionNoticeDate && years) {
    const limit = new Date(profile.exemptionNoticeDate);
    limit.setFullYear(limit.getFullYear() + years);
    const diffMs = limit.getTime() - issueDate.getTime();
    daysRemaining = Math.floor(diffMs / 86_400_000);
    validityOk = diffMs >= 0;
  }
  items.push({
    key: "validity",
    ok: validityOk,
    label: !profile.exemptionNoticeDate
      ? r("validityMissing")
      : validityOk
        ? r("validityOk", { days: daysRemaining ?? 0 })
        : r("validityExpired"),
    fixHref: validityOk ? null : "/ayarlar/dernek",
    daysRemaining,
  });

  // 3) Şablon metin onayı (§ 14).
  const templateOk = settings?.templateConfirmedVersion === TEMPLATE_VERSION;
  items.push({
    key: "template",
    ok: templateOk,
    label: templateOk ? r("templateOk") : r("templateMissing"),
    fixHref: templateOk ? null : "/bagislar/ayarlar",
    daysRemaining: null,
  });

  // 4) Aidat indirilebilirliği (§ 11 md. 8 md. 4).
  items.push({
    key: "membershipFees",
    ok: profile.membershipFeesDeductible,
    label: profile.membershipFeesDeductible ? r("feesOk") : r("feesOff"),
    fixHref: profile.membershipFeesDeductible ? null : "/ayarlar/dernek",
    daysRemaining: null,
  });

  const donationBlockers = items.filter((item) => item.key !== "membershipFees" && !item.ok);
  const feeBlockers = items.filter((item) => !item.ok);
  return {
    canIssueDonation: donationBlockers.length === 0,
    canIssueMembershipFee: feeBlockers.length === 0,
    items,
  };
}

/**
 * assertCanIssue (§ 11 md. 8): üretim aksiyonlarının ilk adımı; alıcı adresi
 * denetimi çağıran tarafta (builder) yapılır. Eksikler TEK hatada listelenir.
 */
export async function assertCanIssue(
  issueDate: Date,
  content: IssueContent,
): Promise<void> {
  const readiness = await getReadiness(issueDate);
  const blockers = readiness.items.filter((item) =>
    content === "MEMBERSHIP_FEE" ? !item.ok : !item.ok && item.key !== "membershipFees",
  );
  if (blockers.length > 0) {
    throw new ReadinessError(blockers.map((item) => item.label));
  }
}

/** Bildirim nüsha saklama süresinin sonu (31.12.issuedYear + 8 yıl). */
export function retentionEndDate(issuedAt: Date): Date {
  return new Date(Date.UTC(issuedAt.getUTCFullYear() + CONFIRMATION_RETENTION_YEARS, 11, 31));
}
