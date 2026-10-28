"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { SidebarTrigger } from "./sidebar";

/**
 * Üst Araç Çubuğu (Topbar):
 * Dil ve Tema ayarları doğrudan /ayarlar sayfasına;
 * Kullanıcı profili ve oturum kapatma sol panelin (Sidebar) altına taşınmıştır.
 */
export function Topbar() {
  const tNav = useTranslations("nav");

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-default-200/80 bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <span className="text-small font-bold tracking-tight text-foreground lg:hidden">
          Dernek ERP
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/ayarlar"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-tiny font-medium text-default-500 transition-colors hover:bg-default-100/80 hover:text-foreground"
          aria-label={tNav.has("ayarlar") ? tNav("ayarlar") : "Ayarlar"}
        >
          <Settings className="h-4 w-4 text-default-400" />
          <span className="hidden sm:inline">
            {tNav.has("ayarlar") ? tNav("ayarlar") : "Ayarlar"}
          </span>
        </Link>
      </div>
    </header>
  );
}
