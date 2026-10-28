"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@heroui/react";
import {
  BarChart3,
  Boxes,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  Download,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  FolderTree,
  HandHeart,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  LucideIcon,
  Package,
  PieChart,
  Receipt,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { allModules } from "@/registry";
import type { TopNavItem } from "@/shared/types/module";
import { cn } from "@/shared/utils";
import { SidebarTrigger } from "./sidebar";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Boxes,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  FolderTree,
  HandHeart,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Package,
  PieChart,
  Receipt,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  Upload,
  Users,
  Wallet,
};

function resolveIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  return ICON_MAP[iconName] ?? null;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations("nav");
  const tRoot = useTranslations();

  // Aktif modül ve modülün menu/top.json üzerinden gelen menü öğeleri
  const activeModule = useMemo(() => {
    // 1. Pathname ile eşleşen kayıtlı modülü bul
    const found = allModules.find((mod) => {
      // Modülün ana menü rotası
      if (mod.nav.some((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))) {
        return true;
      }
      // Modülün topNav rotaları
      if (mod.topNav?.some((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))) {
        return true;
      }
      return false;
    });

    if (found) {
      const mainHref = found.nav[0]?.href ?? `/${found.key}`;
      return {
        key: found.key,
        label: tNav.has(found.key) ? tNav(found.key) : found.label,
        mainHref,
        icon: found.nav[0]?.icon ?? Package,
        topNav: found.topNav ?? [],
      };
    }

    // 2. /ayarlar genel sayfası (system modülü ile ilişkili)
    if (pathname.startsWith("/ayarlar")) {
      const systemMod = allModules.find((m) => m.key === "system");
      return {
        key: "system",
        label: tNav.has("ayarlar") ? tNav("ayarlar") : "Ayarlar",
        mainHref: "/ayarlar",
        icon: Settings,
        topNav: systemMod?.topNav ?? [],
      };
    }

    // 3. Varsayılan Panel / Dashboard
    return {
      key: "dashboard",
      label: tNav.has("panel") ? tNav("panel") : "Panel",
      mainHref: "/",
      icon: LayoutDashboard,
      topNav: [],
    };
  }, [pathname, tNav]);

  const ModuleIcon = activeModule.icon;

  // i18n etiket çözücü: modül anahtarını veya doğrudan kök anahtarı dener
  const resolveLabel = (item: TopNavItem): string => {
    if (item.labelKey) {
      const namespacedKey = `${activeModule.key}.${item.labelKey}`;
      if (tRoot.has(namespacedKey)) return tRoot(namespacedKey);
      if (tRoot.has(item.labelKey)) return tRoot(item.labelKey);
    }
    return item.label;
  };

  return (
    <header className="sticky top-0 z-20 flex h-10 w-full items-center justify-between border-b border-default-200/80 bg-background/85 px-3 backdrop-blur-md select-none transition-all">
      {/* Sol Bölüm: Geri Butonu + Modül Başlığı + Modül Menü Linkleri (menu/top.json) */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        {/* Mobilde Menü Çekmecesi Tetikleyici */}
        <SidebarTrigger />

        {/* Tek Geri Butonu */}
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

        {/* Açık Olan Modülün İsmi (Ana sayfasına tıklandığında döner) */}
        <Link
          href={activeModule.mainHref}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-default-100/70 border border-default-200/50 hover:bg-default-100 hover:border-default-300/70 shrink-0 transition-colors"
          title={`${activeModule.label} ana sayfasına git`}
        >
          <ModuleIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[11.5px] font-bold tracking-tight text-foreground truncate">
            {activeModule.label}
          </span>
        </Link>

        {/* Modüle ait üst menü linkleri (menu/top.json standartı) */}
        {activeModule.topNav.length > 0 && (
          <>
            <div className="h-3.5 w-px bg-default-200/90 mx-0.5 shrink-0" aria-hidden />
            <nav className="flex items-center gap-1 shrink-0">
              {activeModule.topNav.map((link) => {
                const active =
                  pathname === link.href || (!link.isDownload && pathname.startsWith(`${link.href}/`));
                const LinkIcon = resolveIcon(link.icon);
                const label = resolveLabel(link);

                if (link.isDownload) {
                  return (
                    <a
                      key={link.key}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors shrink-0",
                        "text-default-600 hover:bg-default-100/80 hover:text-foreground border border-default-200/50 hover:border-default-300",
                      )}
                    >
                      {LinkIcon && <LinkIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                      <span>{label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors shrink-0",
                      active
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300 font-semibold shadow-2xs border border-primary-200/60 dark:border-primary-500/30"
                        : "text-default-600 hover:bg-default-100/80 hover:text-foreground border border-transparent hover:border-default-200/60",
                    )}
                  >
                    {LinkIcon && <LinkIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Sağ Taraf: Boş / Temiz */}
      <div className="shrink-0" />
    </header>
  );
}
