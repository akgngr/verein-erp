"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import {
  Boxes,
  Building2,
  CalendarDays,
  ChevronLeft,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  HandHeart,
  LayoutDashboard,
  LucideIcon,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/utils";
import { SidebarTrigger } from "./sidebar";

type ModuleSettingLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

type ActiveModuleConfig = {
  key: string;
  label: string;
  icon: LucideIcon;
  settingsLinks: ModuleSettingLink[];
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");

  // Yalnızca açık olan modülle alakalı ayarlar ve ek yapılandırma alanları
  const getActiveModule = (): ActiveModuleConfig => {
    if (pathname.startsWith("/muhasebe")) {
      return {
        key: "accounting",
        label: tNav.has("muhasebe") ? tNav("muhasebe") : "Muhasebe",
        icon: Wallet,
        settingsLinks: [
          {
            label: "Muhasebe Ayarları",
            href: "/muhasebe/ayarlar",
            icon: SlidersHorizontal,
          },
        ],
      };
    }

    if (pathname.startsWith("/evrak")) {
      return {
        key: "documents",
        label: tNav.has("evrak") ? tNav("evrak") : "Evrak Kayıt",
        icon: FileText,
        settingsLinks: [
          {
            label: "Evrak Kategorileri",
            href: "/evrak/kategoriler",
            icon: FolderKanban,
          },
        ],
      };
    }

    if (pathname.startsWith("/uyeler")) {
      return {
        key: "members",
        label: tNav.has("uyeler") ? tNav("uyeler") : "Üyeler",
        icon: Users,
        settingsLinks: [
          {
            label: "Üyelik Türleri",
            href: "/uyeler/turler",
            icon: Tag,
          },
          {
            label: "Excel İçe Aktar",
            href: "/uyeler/ice-aktar",
            icon: FileSpreadsheet,
          },
        ],
      };
    }

    if (pathname.startsWith("/toplantilar")) {
      return {
        key: "meetings",
        label: tNav.has("toplantilar") ? tNav("toplantilar") : "Toplantılar",
        icon: CalendarDays,
        settingsLinks: [],
      };
    }

    if (pathname.startsWith("/bagislar")) {
      return {
        key: "donations",
        label: tNav.has("bagislar") ? tNav("bagislar") : "Bağışlar",
        icon: HandHeart,
        settingsLinks: [],
      };
    }

    if (pathname.startsWith("/ayarlar")) {
      return {
        key: "settings",
        label: tNav.has("ayarlar") ? tNav("ayarlar") : "Ayarlar",
        icon: Settings,
        settingsLinks: [
          {
            label: "Dernek Bilgileri",
            href: "/ayarlar/dernek",
            icon: Building2,
          },
          {
            label: "Kullanıcılar & Roller",
            href: "/ayarlar/kullanicilar",
            icon: Users,
          },
          {
            label: "Modül Yönetimi",
            href: "/ayarlar/moduller",
            icon: Boxes,
          },
          {
            label: "Denetim Kayıtları",
            href: "/ayarlar/denetim-kaydi",
            icon: ShieldAlert,
          },
        ],
      };
    }

    return {
      key: "dashboard",
      label: tNav.has("panel") ? tNav("panel") : "Panel",
      icon: LayoutDashboard,
      settingsLinks: [],
    };
  };

  const activeModule = getActiveModule();
  const ModuleIcon = activeModule.icon;

  return (
    <header className="sticky top-0 z-20 flex h-9.5 w-full items-center justify-between border-b border-default-200/80 bg-background/85 px-3 backdrop-blur-md select-none transition-all">
      {/* Sol Bölüm: Geri Butonu + Modül İsmi + SADECE Modül Ayarları / Yapılandırma Linkleri */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        {/* Mobilde Menü Çekmecesi Tetikleyici */}
        <SidebarTrigger />

        {/* Tek Geri Butonu (Yeni ekleme / detay sayfasından önceki listeye dönmek için) */}
        <Button
          isIconOnly
          variant="light"
          size="sm"
          aria-label="Geri git"
          title="Geri git"
          className="h-7 w-7 min-w-7 rounded-md text-default-500 hover:bg-default-100 hover:text-foreground active:scale-95 transition-transform"
          onPress={() => router.back()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="h-3.5 w-px bg-default-200/90 mx-0.5 shrink-0" aria-hidden />

        {/* Açık Olan Modülün İsmi */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-default-100/70 border border-default-200/50 shrink-0">
          <ModuleIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-bold tracking-tight text-foreground truncate">
            {activeModule.label}
          </span>
        </div>

        {/* YALNIZCA ilgili modüle ait ayar ve ek yapılandırma alanlarının linkleri */}
        {activeModule.settingsLinks.length > 0 && (
          <>
            <div className="h-3.5 w-px bg-default-200/90 mx-0.5 shrink-0" aria-hidden />
            <nav className="flex items-center gap-1 shrink-0">
              {activeModule.settingsLinks.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const LinkIcon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-md font-medium transition-colors shrink-0",
                      active
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300 font-semibold shadow-2xs"
                        : "text-default-500 hover:bg-default-100/80 hover:text-foreground",
                    )}
                  >
                    {LinkIcon && <LinkIcon className="h-3 w-3 shrink-0 opacity-70" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Sağ Taraf: Boş / Temiz (Genel ayarlar ikonu kaldırıldı) */}
      <div className="shrink-0" />
    </header>
  );
}
