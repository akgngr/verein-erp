import { Download, FilePlus2, HandHeart, Receipt, Settings2, Users } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { donationsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "donations",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Bağışlar",
  description: "Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi.",
  category: "OFFICIAL",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  access: [
    { module: "accounting", operations: ["read", "write"] },
    { module: "members", operations: ["read"] },
    { module: "organization", operations: ["read"] },
  ],
  nav: [
    {
      href: "/bagislar",
      label: "Bağışlar",
      labelKey: "bagislar",
      icon: HandHeart,
      group: "main",
      order: 5,
      permission: { definition: donationsPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "donors", label: "Bağışçılar", href: "/bagislar/bagiscilar", icon: Users },
    { key: "confirmations", label: "Bildirimler", href: "/bagislar/bildirimler", icon: Receipt },
    {
      key: "issue",
      label: "Bildirim oluştur",
      href: "/bagislar/bildirimler/olustur",
      icon: FilePlus2,
      permission: { definition: donationsPermissions, action: "approve" },
    },
    { key: "settings", label: "Ayarlar", href: "/bagislar/ayarlar", icon: Settings2 },
    { key: "export", label: "Excel'e aktar", href: "/api/donations/export", icon: Download, isDownload: true },
  ],
};
