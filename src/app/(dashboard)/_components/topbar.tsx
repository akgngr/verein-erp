"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  HandHeart,
  LayoutDashboard,
  LucideIcon,
  Settings,
  Sliders,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/shared/utils";
import { SidebarTrigger } from "./sidebar";

type ModuleSubItem = {
  label: string;
  href: string;
  exact?: boolean;
};

type ActiveModuleConfig = {
  key: string;
  label: string;
  icon: LucideIcon;
  settingsHref?: string;
  settingsLabel?: string;
  items: ModuleSubItem[];
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");

  // Aktif modül ve alt menü linklerinin dinamik yapılandırması
  const getActiveModule = (): ActiveModuleConfig => {
    if (pathname.startsWith("/muhasebe")) {
      return {
        key: "accounting",
        label: tNav.has("muhasebe") ? tNav("muhasebe") : "Muhasebe",
        icon: Wallet,
        settingsHref: "/muhasebe/ayarlar",
        settingsLabel: "Hesap & Bütçe Ayarları",
        items: [
          { label: "Defter & Fişler", href: "/muhasebe", exact: true },
          { label: "Yeni Fiş", href: "/muhasebe/yeni" },
          { label: "Mali Raporlar", href: "/muhasebe/raporlar" },
          { label: "Bütçe", href: "/muhasebe/butce" },
          { label: "Yıl Kapanışı", href: "/muhasebe/yil-kapanisi" },
          { label: "Üyelik Aktarımı", href: "/muhasebe/uyelik-aktarimi" },
          { label: "Ayarlar", href: "/muhasebe/ayarlar" },
        ],
      };
    }

    if (pathname.startsWith("/evrak")) {
      return {
        key: "documents",
        label: tNav.has("evrak") ? tNav("evrak") : "Evrak Kayıt",
        icon: FileText,
        settingsHref: "/evrak/kategoriler",
        settingsLabel: "Evrak Kategorileri",
        items: [
          { label: "Tüm Evraklar", href: "/evrak", exact: true },
          { label: "Yeni Evrak", href: "/evrak/yeni" },
          { label: "Kategoriler", href: "/evrak/kategoriler" },
        ],
      };
    }

    if (pathname.startsWith("/toplantilar")) {
      return {
        key: "meetings",
        label: tNav.has("toplantilar") ? tNav("toplantilar") : "Toplantılar",
        icon: CalendarDays,
        items: [
          { label: "Toplantı Takvimi", href: "/toplantilar", exact: true },
          { label: "Yeni Toplantı", href: "/toplantilar/yeni" },
          { label: "Karar & Görevler", href: "/toplantilar/gorevler" },
        ],
      };
    }

    if (pathname.startsWith("/uyeler")) {
      return {
        key: "members",
        label: tNav.has("uyeler") ? tNav("uyeler") : "Üyeler",
        icon: Users,
        settingsHref: "/uyeler/turler",
        settingsLabel: "Üyelik Türleri",
        items: [
          { label: "Üye Listesi", href: "/uyeler", exact: true },
          { label: "Yeni Üye", href: "/uyeler/yeni" },
          { label: "Aidat Takibi", href: "/uyeler/aidat" },
          { label: "Üyelik Türleri", href: "/uyeler/turler" },
          { label: "Excel İçe Aktar", href: "/uyeler/ice-aktar" },
        ],
      };
    }

    if (pathname.startsWith("/bagislar")) {
      return {
        key: "donations",
        label: tNav.has("bagislar") ? tNav("bagislar") : "Bağışlar",
        icon: HandHeart,
        items: [
          { label: "Bağış Listesi", href: "/bagislar", exact: true },
          { label: "Yeni Bağış", href: "/bagislar/yeni" },
        ],
      };
    }

    if (pathname.startsWith("/ayarlar")) {
      return {
        key: "settings",
        label: tNav.has("ayarlar") ? tNav("ayarlar") : "Ayarlar",
        icon: Settings,
        settingsHref: "/ayarlar",
        settingsLabel: "Tüm Ayarlar",
        items: [
          { label: "Genel Bakış", href: "/ayarlar", exact: true },
          { label: "Dernek Bilgileri", href: "/ayarlar/dernek" },
          { label: "Kullanıcılar & Roller", href: "/ayarlar/kullanicilar" },
          { label: "Modül Yönetimi", href: "/ayarlar/moduller" },
          { label: "Denetim Kayıtları", href: "/ayarlar/denetim-kaydi" },
        ],
      };
    }

    return {
      key: "dashboard",
      label: tNav.has("panel") ? tNav("panel") : "Panel",
      icon: LayoutDashboard,
      items: [{ label: "Özet Görünüm", href: "/", exact: true }],
    };
  };

  const activeModule = getActiveModule();
  const ModuleIcon = activeModule.icon;

  const isItemActive = (item: ModuleSubItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-10 w-full items-center justify-between border-b border-default-200/80 bg-background/85 px-3 backdrop-blur-md select-none transition-all">
      {/* Sol Bölüm: Geri/İleri + Modül Kimliği + macOS Menü Çubuğu */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        {/* Mobilde Menü Çekmecesi Tetikleyici */}
        <SidebarTrigger />

        {/* macOS Pencere Navigasyon Butonları: Geri & İleri */}
        <div className="flex items-center gap-0.5">
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

          <Button
            isIconOnly
            variant="light"
            size="sm"
            aria-label="İleri git"
            title="İleri git"
            className="h-7 w-7 min-w-7 rounded-md text-default-400 hover:bg-default-100 hover:text-foreground active:scale-95 transition-transform hidden sm:flex"
            onPress={() => window.history.forward()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-3.5 w-px bg-default-200/90 mx-0.5 shrink-0" aria-hidden />

        {/* Aktif Modül Başlığı / Rozeti */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-default-100/70 border border-default-200/50 shrink-0">
          <ModuleIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-bold tracking-tight text-foreground truncate max-w-[120px] sm:max-w-none">
            {activeModule.label}
          </span>
        </div>

        {/* macOS Menü Çubuğu (Masaüstü: Yatay Menü Öğeleri) */}
        {activeModule.items.length > 0 && (
          <nav className="hidden md:flex items-center gap-0.5 ml-1 overflow-x-auto no-scrollbar">
            {activeModule.items.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md font-medium transition-colors shrink-0",
                    active
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300 font-semibold shadow-2xs"
                      : "text-default-600 hover:bg-default-100/80 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Mobilde Açılır Alt Menü Dropdown (Ekran küçüldüğünde) */}
        {activeModule.items.length > 1 && (
          <div className="md:hidden">
            <Dropdown placement="bottom-start">
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="light"
                  className="h-7 px-2 text-tiny font-medium text-default-600 flex items-center gap-1"
                >
                  <span>Menü</span>
                  <ChevronDown className="h-3 w-3 text-default-400" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Modül alt sayfaları">
                {activeModule.items.map((item) => (
                  <DropdownItem
                    key={item.href}
                    href={item.href}
                    className={isItemActive(item) ? "text-primary font-semibold" : ""}
                  >
                    {item.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        )}
      </div>

      {/* Sağ Bölüm: Modül Yapılandırma Kısayolu ve Genel Ayarlar */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
        {/* Modüle özel ayar/yapılandırma kısayolu (varsa) */}
        {activeModule.settingsHref && (
          <Link
            href={activeModule.settingsHref}
            className="flex items-center gap-1 text-[11px] font-medium text-default-500 hover:text-foreground px-2 py-1 rounded-md hover:bg-default-100 transition-colors"
            title={activeModule.settingsLabel || "Modül Ayarları"}
          >
            <Sliders className="h-3.5 w-3.5 text-default-400" />
            <span className="hidden xl:inline text-tiny">
              {activeModule.settingsLabel || "Yapılandırma"}
            </span>
          </Link>
        )}

        {/* Genel Sistem Ayarları */}
        <Link
          href="/ayarlar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-default-500 hover:bg-default-100 hover:text-foreground transition-colors"
          title={tNav.has("ayarlar") ? tNav("ayarlar") : "Sistem Ayarları"}
          aria-label="Sistem Ayarları"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}
