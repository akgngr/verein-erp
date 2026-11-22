/**
 * § 72a Abs. 5 SGB VIII uyarınca yasal kayıt durumu:
 * - CLEARED: İbraz edildi, mevzuata göre engel teşkil eden hüküm/durum yok (geeignet).
 * - EXCLUDED: Mevzuat uyarınca (§ 72a Abs. 1 SGB VIII) faaliyetten men edilmiş (ausgeschlossen).
 * - PENDING: İbraz bekleniyor (ausstehend).
 */
export type YouthProtectionRecordStatus = "CLEARED" | "EXCLUDED" | "PENDING";

/**
 * İbraz geçerlilik durumu:
 * - overdue: İbraz süresi geçmiş (derhal yenilenmeli)
 * - upcoming: 3 ay içinde süresi dolacak (sekreter uyarısı verir)
 * - valid: Geçerli (3 aydan fazla süresi var)
 * - ended: Faaliyet sona ermiş (yasal saklama/silinme beklemesinde)
 */
export type YouthProtectionValidityStatus = "overdue" | "upcoming" | "valid" | "ended";

/** Liste ve form satırı (Prisma modelinden bağımsız, istemciye geçen veri). */
export type YouthProtectionRow = {
  id: string;
  personName: string;
  memberId: string | null;
  userId: string | null;
  inspectionDate: Date;
  certificateIssueDate: Date;
  inspectingOfficer: string;
  nextDueDate: Date;
  status: YouthProtectionRecordStatus;
  activityEndedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function getInspectionStatus(
  nextDueDate: Date,
  activityEndedAt?: Date | null,
  now: Date = new Date(),
): YouthProtectionValidityStatus {
  if (activityEndedAt) {
    return "ended";
  }

  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  if (nextDueDate < now) {
    return "overdue";
  }
  if (nextDueDate <= threeMonthsLater) {
    return "upcoming";
  }
  return "valid";
}
