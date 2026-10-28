import { CalendarDays } from "lucide-react";
import type { ModuleConfig, TopNavItem } from "@/shared/types/module";
import { eventsPermissions } from "./permissions";
import topNav from "./menu/top.json";

export const moduleConfig: ModuleConfig = {
  key: "events",
  label: "Etkinlikler",
  description: "Dernek etkinlikleri, seminerler, atölyeler ve katılımcı yönetimi.",
  category: "EXTENSION",
  hasSchema: true,
  topNav: topNav as TopNavItem[],
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
};
