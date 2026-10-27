import { AlertTriangle, CalendarDays, FileText, Users } from "lucide-react";
import Link from "next/link";

import { requireUser } from "@/modules/auth/server";
import { getDocumentStats } from "@/modules/documents/server";
import { documentsPermissions, type DocumentStats } from "@/modules/documents";
import { getMeetingStats } from "@/modules/meetings/server";
import { meetingsPermissions, type MeetingStats } from "@/modules/meetings";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { formatDate } from "@/shared/utils";

export const metadata = { title: "Panel" };

// KARAR: Kartlar HeroUI yerine düz markup ile çizilir; böylece panel sayfası tamamen
// sunucu tarafında kalır (HeroUI v2 client bileşen gerektirir). Toplantı kartı Faz 2
// ile gerçek değerleri gösterir; Üye kartı yer tutucudur (sonraki fazlar).
function SummaryCard({
  href,
  icon: Icon,
  title,
  subtitle,
  danger,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  subtitle: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-row items-center gap-4 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm transition-colors hover:border-primary-300"
    >
      <div className="rounded-medium bg-primary-50 p-3 text-primary dark:bg-primary-100/20">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className={`text-2xl font-semibold leading-none ${danger ? "text-danger-600" : ""}`}>
          {title}
        </p>
        <p className="mt-1 text-small text-default-500">{subtitle}</p>
      </div>
    </Link>
  );
}

function PlaceholderCard({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <div className="flex flex-row items-center gap-4 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm">
      <div className="rounded-medium bg-primary-50 p-3 text-primary dark:bg-primary-100/20">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none">0</p>
        <p className="mt-1 text-small text-default-500">{label}</p>
      </div>
    </div>
  );
}

export default async function PanelPage() {
  const user = await requireUser();

  // KARAR: Yetki, kartın görünürlüğünü belirler; yetkisiz role kart hiç render
  // edilmez (11. bölüm). İstatistik sorgusu hata verirse panel tüm sayfayı
  // bozmamak için kartı gizler.
  let stats: DocumentStats | null = null;
  if (can(user.role, documentsPermissions, "view")) {
    try {
      stats = await getDocumentStats();
    } catch (error) {
      console.error("[panel] Evrak istatistiği alınamadı:", error);
    }
  }

  // Toplantı kartı (11. bölüm): sıradaki toplantı + onay bekleyen tutanak +
  // açık/gecikmiş görev sayıları.
  let meetingStats: MeetingStats | null = null;
  if (can(user.role, meetingsPermissions, "view")) {
    try {
      meetingStats = await getMeetingStats();
    } catch (error) {
      console.error("[panel] Toplantı istatistiği alınamadı:", error);
    }
  }

  return (
    <div>
      <PageHeader title="Panel" description="Dernek yönetim sistemine hoş geldiniz." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats ? (
          <SummaryCard
            href="/evrak"
            icon={FileText}
            title={`Açık + işlemde: ${stats.open + stats.inProgress}`}
            subtitle={`Süresi geçmiş: ${stats.overdue}`}
            danger={stats.overdue > 0}
          />
        ) : null}
        {meetingStats ? (
          <SummaryCard
            href="/toplantilar"
            icon={CalendarDays}
            title={
              meetingStats.nextMeeting
                ? `${meetingStats.nextMeeting.meetingNumber} — ${formatDate(meetingStats.nextMeeting.meetingDate)}`
                : `Planlanan: ${meetingStats.plannedCount}`
            }
            subtitle={`Onay bekleyen tutanak: ${meetingStats.draftMinutesCount} · Açık görev: ${meetingStats.openActionItems} (gecikmiş: ${meetingStats.overdueActionItems})`}
            danger={meetingStats.overdueActionItems > 0}
          />
        ) : null}
        <PlaceholderCard icon={Users} label="Üye" />
      </div>
      {stats && stats.overdue > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-medium border border-danger-200 bg-danger-50 px-4 py-3 text-small text-danger-600 dark:border-danger-100 dark:bg-danger-100/20">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Son işlem tarihi geçmiş {stats.overdue} evrak bulunuyor.{" "}
            <Link href="/evrak?filter.overdue=1" className="underline">
              Süresi geçmişleri görüntüle
            </Link>
          </span>
        </div>
      ) : null}
      {meetingStats && meetingStats.overdueActionItems > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-medium border border-danger-200 bg-danger-50 px-4 py-3 text-small text-danger-600 dark:border-danger-100 dark:bg-danger-100/20">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Süresi geçmiş {meetingStats.overdueActionItems} toplantı görevi bulunuyor.{" "}
            <Link href="/toplantilar/gorevler?filter.overdue=1" className="underline">
              Gecikmiş görevleri görüntüle
            </Link>
          </span>
        </div>
      ) : null}
    </div>
  );
}
