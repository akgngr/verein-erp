import { CalendarDays, Clock, Download, History } from "lucide-react"
import type { ModuleConfig } from "@/shared/types/module"
import { eventsPermissions } from "./permissions"

export const moduleConfig: ModuleConfig = {
  key: "events",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.2.0",
  label: "Etkinlikler",
  description:
    "Dernek etkinlikleri, seminerler, atölyeler ve katılımcı yönetimi.",
  category: "OFFICIAL",
  hasSchema: true,
  // Üyeye bağlı katılımcıların iletişim izinleri (kampanya duyuruları) üyeler modülünden okunur.
  access: [{ module: "members", operations: ["read"] }, { module: "mailings", operations: ["read"] }],
  nav: [
    {
      href: "/events",
      label: "Etkinlikler",
      labelKey: "events",
      icon: CalendarDays,
      group: "main",
      order: 25,
      permission: { definition: eventsPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "upcoming", label: "Yaklaşan etkinlikler", href: "/events?filter.timeFilter=upcoming", icon: Clock },
    { key: "past", label: "Geçmiş etkinlikler", href: "/events?filter.timeFilter=past", icon: History },
    { key: "export", label: "Excel'e aktar", href: "/api/events/export", icon: Download, isDownload: true },
  ],
}
