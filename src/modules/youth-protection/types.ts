/**
 * İbraz durumu (§ 72a SGB VIII):
 * - overdue: İbraz süresi geçmiş (derhal yenilenmeli)
 * - upcoming: 3 ay içinde süresi dolacak (sekreter uyarısı verir)
 * - valid: Geçerli (3 aydan fazla süresi var)
 */
export type YouthProtectionStatus = "overdue" | "upcoming" | "valid";

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
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function getInspectionStatus(nextDueDate: Date, now: Date = new Date()): YouthProtectionStatus {
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
