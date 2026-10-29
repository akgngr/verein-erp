import { CalendarDays, Clock, History } from "lucide-react"
import type { ModuleConfig } from "@/shared/types/module"
import { eventsPermissions } from "./permissions"

export const moduleConfig: ModuleConfig = {
  key: "events",
  label: "Etkinlikler",
  description:
    "Dernek etkinlikleri, seminerler, atölyeler ve katılımcı yönetimi.",
  category: "EXTENSION",
  hasSchema: true,
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
  ],
}
