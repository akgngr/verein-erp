import { AlertTriangle, ArrowRight, CalendarDays, FileText, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { requireUser } from "@/modules/auth/server";
import { getDocumentStats } from "@/modules/documents/server";
import { documentsPermissions, type DocumentStats } from "@/modules/documents";
import { getMeetingStats } from "@/modules/meetings/server";
import { meetingsPermissions, type MeetingStats } from "@/modules/meetings";
import { getMemberStats } from "@/modules/members/server";
import { membersPermissions, type MemberStats } from "@/modules/members";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { formatDate } from "@/shared/utils";
import { cn } from "@/shared/utils";

export const metadata = { title: "Panel" };

type DetailItem = { label: string; value: string | number; danger?: boolean };

function StatCard({
  href,
  icon: Icon,
  category,
  primaryMetric,
  primaryLabel,
  badge,
  danger,
  details,
}: {
  href: string;
  icon: LucideIcon;
  category: string;
  primaryMetric: string | number;
  primaryLabel: string;
  badge?: { text: string; color: "danger" | "warning" | "success" | "primary" };
  danger?: boolean;
  details: DetailItem[];
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-all duration-200",
        "bg-content1 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-500/50",
        danger ? "border-danger-200 dark:border-danger-900/50" : "border-default-200/80",
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                danger
                  ? "bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-400"
                  : "bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
              )}
            >
              <Icon className="h-4.5 w-4.5" aria-hidden />
            </div>
            <span className="text-small font-semibold text-foreground/80">{category}</span>
          </div>
          {badge && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-tiny font-medium",
                badge.color === "danger" &&
                  "bg-danger-50 text-danger-600 border border-danger-200 dark:bg-danger-500/15 dark:border-danger-800/50",
                badge.color === "warning" &&
                  "bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-500/15 dark:border-warning-800/50",
                badge.color === "success" &&
                  "bg-success-50 text-success-700 border border-success-200 dark:bg-success-500/15 dark:border-success-800/50",
                badge.color === "primary" &&
                  "bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-500/15 dark:border-primary-800/50",
              )}
            >
              {badge.text}
            </span>
          )}
        </div>

        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground truncate">
              {primaryMetric}
            </span>
            <span className="text-small text-default-500 font-medium truncate">{primaryLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-default-100 flex flex-wrap items-center gap-y-1 gap-x-3 text-tiny">
        {details.map((item, idx) => (
          <span
            key={idx}
            className={cn(
              "flex items-center gap-1",
              item.danger ? "text-danger-600 font-medium" : "text-default-500",
            )}
          >
            <span>{item.label}:</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </span>
        ))}
      </div>
    </Link>
  );
}

function AlertBanner({
  icon: Icon,
  message,
  actionHref,
  actionText,
}: {
  icon: typeof AlertTriangle;
  message: string;
  actionHref: string;
  actionText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-danger-200/90 bg-danger-50/60 p-4 text-small text-danger-700 dark:border-danger-900/60 dark:bg-danger-950/30 dark:text-danger-300">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger-100 text-danger-600 dark:bg-danger-900/50 dark:text-danger-300">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <span className="font-medium">{message}</span>
      </div>
      <Link
        href={actionHref}
        className="inline-flex shrink-0 items-center gap-1.5 text-small font-semibold text-danger-700 hover:text-danger-800 dark:text-danger-300 dark:hover:text-danger-200 underline underline-offset-4"
      >
        <span>{actionText}</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

export default async function PanelPage() {
  const user = await requireUser();

  let stats: DocumentStats | null = null;
  if (can(user.role, documentsPermissions, "view")) {
    try {
      stats = await getDocumentStats();
    } catch (error) {
      console.error("[panel] Evrak istatistiği alınamadı:", error);
    }
  }

  let meetingStats: MeetingStats | null = null;
  if (can(user.role, meetingsPermissions, "view")) {
    try {
      meetingStats = await getMeetingStats();
    } catch (error) {
      console.error("[panel] Toplantı istatistiği alınamadı:", error);
    }
  }

  let memberStats: MemberStats | null = null;
  if (can(user.role, membersPermissions, "view")) {
    try {
      memberStats = await getMemberStats();
    } catch (error) {
      console.error("[panel] Üye istatistiği alınamadı:", error);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genel Bakış"
        description="Dernek yönetim sistemi ve operasyonel özet durumu."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats ? (
          <StatCard
            href="/evrak"
            icon={FileText}
            category="Evrak Kayıt"
            primaryMetric={stats.open + stats.inProgress}
            primaryLabel="Açık / İşlemde"
            badge={stats.overdue > 0 ? { text: `${stats.overdue} Gecikmiş`, color: "danger" } : undefined}
            danger={stats.overdue > 0}
            details={[
              { label: "Bu ay gelen", value: stats.incomingThisMonth },
              { label: "Bu ay giden", value: stats.outgoingThisMonth },
              ...(stats.overdue > 0 ? [{ label: "Süresi geçmiş", value: stats.overdue, danger: true }] : []),
            ]}
          />
        ) : null}

        {meetingStats ? (
          <StatCard
            href="/toplantilar"
            icon={CalendarDays}
            category="Toplantı & Tutanak"
            primaryMetric={
              meetingStats.nextMeeting
                ? formatDate(meetingStats.nextMeeting.meetingDate)
                : meetingStats.plannedCount
            }
            primaryLabel={
              meetingStats.nextMeeting
                ? `Sıradaki: ${meetingStats.nextMeeting.meetingNumber}`
                : "Planlanan Toplantı"
            }
            badge={
              meetingStats.overdueActionItems > 0
                ? { text: `${meetingStats.overdueActionItems} Gecikmiş Görev`, color: "danger" }
                : undefined
            }
            danger={meetingStats.overdueActionItems > 0}
            details={[
              { label: "Onay bekleyen", value: meetingStats.draftMinutesCount },
              { label: "Açık görev", value: meetingStats.openActionItems },
              ...(meetingStats.overdueActionItems > 0
                ? [{ label: "Gecikmiş görev", value: meetingStats.overdueActionItems, danger: true }]
                : []),
            ]}
          />
        ) : null}

        <StatCard
          href="/uyeler"
          icon={Users}
          category="Üye Yönetimi"
          primaryMetric={memberStats ? memberStats.active : 0}
          primaryLabel="Aktif Üye"
          details={[
            { label: "Bu ay yeni", value: memberStats ? memberStats.newThisMonth : 0 },
            { label: "Pasif", value: memberStats ? memberStats.passive : 0 },
            { label: "Ayrılan", value: memberStats ? memberStats.resigned : 0 },
          ]}
        />
      </div>

      <div className="space-y-3">
        {stats && stats.overdue > 0 ? (
          <AlertBanner
            icon={AlertTriangle}
            message={`Son işlem tarihi geçmiş ${stats.overdue} adet evrak bekliyor.`}
            actionHref="/evrak?filter.overdue=1"
            actionText="Geciken evrakları gör"
          />
        ) : null}

        {meetingStats && meetingStats.overdueActionItems > 0 ? (
          <AlertBanner
            icon={AlertTriangle}
            message={`Termini geçmiş ${meetingStats.overdueActionItems} adet toplantı görevi bulunuyor.`}
            actionHref="/toplantilar/gorevler?filter.overdue=1"
            actionText="Geciken görevleri gör"
          />
        ) : null}
      </div>
    </div>
  );
}
