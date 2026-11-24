import { Activity, Boxes, History, KeyRound, Settings, Wand2, PackageCheck, PanelsTopLeft, ShieldCheck, FileText } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import {
  settingsPermissions,
  systemPermissions,
} from "@/shared/permissions/system";

export const moduleConfig: ModuleConfig = {
  key: "system",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.18.1",
  label: "Modül Yönetimi",
  description: "Sistemde yüklü çekirdek, resmi ve eklenti modüllerin yönetimi.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  // Kurulum sihirbazı muhasebe hazır ayarlarını (kategori/hesap/vergi) yazar.
  access: [
    { module: "accounting", operations: ["read", "write"] },
    // Lisans (RFC-002): kurum adı ve sicil numarası lisansla eşleştirilir.
    { module: "organization", operations: ["read"] },
    // Sağlık kokpiti (F3): admin kullanıcısı varlığı denetlenir.
    { module: "users", operations: ["read"] },
    // Gizlilik ön ayarları ve veri çıkışı raporu (F2a): AI sağlayıcı durumu okunur.
    { module: "ai", operations: ["read"] },
    { module: "widgets", operations: ["read", "write"] },
  ],
  nav: [
    {
      href: "/ayarlar",
      label: "Ayarlar",
      labelKey: "ayarlar",
      icon: Settings,
      group: "settings",
      order: 0,
      permission: { definition: settingsPermissions, action: "view" },
    },
    {
      href: "/ayarlar/widgetlar",
      label: "Widget ayarları",
      labelKey: "widgetlar",
      icon: PanelsTopLeft,
      group: "settings",
      order: 2,
      permission: { definition: settingsPermissions, action: "view" },
    },
    {
      href: "/ayarlar/moduller",
      label: "Modül Yönetimi",
      labelKey: "moduller",
      icon: Boxes,
      group: "settings",
      order: 3,
      permission: { definition: systemPermissions, action: "view" },
    },
    {
      href: "/ayarlar/moduller/saglik",
      label: "Modül ve İş Akışı Sağlığı",
      labelKey: "modulSagligi",
      icon: Activity,
      group: "settings",
      order: 4,
      permission: { definition: systemPermissions, action: "view" },
    },
    {
      href: "/ayarlar/moduller/paketler",
      label: "Modül paketleri",
      labelKey: "modulPaketleri",
      icon: PackageCheck,
      group: "settings",
      order: 5,
      permission: { definition: systemPermissions, action: "view" },
      // Ayrı menü yok: Modül Yönetimi ekranındaki "Yeni modül kur" butonundan açılır.
      hidden: true,
    },
    {
      href: "/ayarlar/kurulum",
      label: "Kurulum sihirbazı",
      labelKey: "kurulum",
      icon: Wand2,
      group: "settings",
      order: 1,
      permission: { definition: systemPermissions, action: "update" },
    },
    {
      // RFC-002: Enterprise lisansı (alan adı + kurum). Yalnız yönetici.
      href: "/ayarlar/lisans",
      label: "Lisans",
      labelKey: "lisans",
      icon: KeyRound,
      group: "settings",
      order: 5,
      permission: { definition: systemPermissions, action: "update" },
    },
    {
      href: "/ayarlar/gizlilik",
      label: "Gizlilik ön ayarları",
      labelKey: "privacyPresets",
      icon: ShieldCheck,
      group: "settings",
      order: 6,
      permission: { definition: systemPermissions, action: "view" },
    },
    {
      href: "/ayarlar/veri-cikisi",
      label: "Veri çıkışı raporu",
      labelKey: "egressReport",
      icon: FileText,
      group: "settings",
      order: 7,
      permission: { definition: systemPermissions, action: "view" },
    },
    {
      href: "/ayarlar/surum-notlari",
      label: "Sürüm notları",
      labelKey: "surumNotlari",
      icon: History,
      group: "settings",
      order: 99,
      permission: { definition: settingsPermissions, action: "view" },
    },
  ],
};
