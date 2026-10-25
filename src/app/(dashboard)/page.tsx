import { CalendarDays, FileText, Users } from "lucide-react";

import { PageHeader } from "@/shared/components/ui/page-header";

export const metadata = { title: "Panel" };

// Bu fazda özet kartları yer tutucudur; iş modülleri eklendiğinde gerçek değerlerle beslenecek.
// KARAR: Kartlar HeroUI yerine düz markup ile çizilir; böylece panel sayfası tamamen sunucu
// tarafında kalır (HeroUI v2 client bileşen gerektirir).
const SUMMARY_CARDS = [
  {
    key: "documents",
    label: "Evrak",
    icon: FileText,
  },
  {
    key: "meetings",
    label: "Toplantı",
    icon: CalendarDays,
  },
  {
    key: "members",
    label: "Üye",
    icon: Users,
  },
];

export default function PanelPage() {
  return (
    <div>
      <PageHeader title="Panel" description="Dernek yönetim sistemine hoş geldiniz." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="flex flex-row items-center gap-4 rounded-medium border border-default-200 bg-content1 p-5 shadow-sm"
            >
              <div className="rounded-medium bg-primary-50 p-3 text-primary dark:bg-primary-100/20">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-none">0</p>
                <p className="mt-1 text-small text-default-500">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
