import { AlertTriangle, CalendarDays, FileText, Users } from "lucide-react";
import Link from "next/link";

import { requireUser } from "@/modules/auth/server";
import { getDocumentStats } from "@/modules/documents/server";
import { documentsPermissions, type DocumentStats } from "@/modules/documents";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";

export const metadata = { title: "Panel" };

// KARAR: Kartlar HeroUI yerine düz markup ile çizilir; böylece panel sayfası tamamen
// sunucu tarafında kalır (HeroUI v2 client bileşen gerektirir). Toplantı ve Üye
// kartları yer tutucudur (sonraki fazlar); Evrak kartı Faz 1 ile gerçek değerleri gösterir.
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

  // KARAR: Yetki, kartın görünürlüğünü belirler; yetkisiz role Evrak kartı
  // hiç render edilmez (9. bölüm). İstatistik sorgusu hata verirse panel
  // tüm sayfayı bozmamak için kartı gizler.
  let stats: DocumentStats | null = null;
  if (can(user.role, documentsPermissions, "view")) {
    try {
      stats = await getDocumentStats();
    } catch (error) {
      console.error("[panel] Evrak istatistiği alınamadı:", error);
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
        <PlaceholderCard icon={CalendarDays} label="Toplantı" />
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
    </div>
  );
}
