import { CalendarRange } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { calendarPermissions } from "./permissions";

/**
 * Takvim: kişisel ve ortak takvimler + diğer modüllerin tarihli kayıtları
 * (calendar.ts sözleşmesi). ICS aboneliğiyle dış takvimlere salt okunur aktarım.
 */
export const moduleConfig: ModuleConfig = {
  key: "calendar",
  version: "1.1.1",
  label: "Takvim",
  description: "Kişisel ve ortak takvimler; etkinlik, toplantı, görev ve son tarihler tek görünümde.",
  category: "OFFICIAL",
  hasSchema: true,
  // Randevu → etkinlik dönüşümü events modülünün yetkili action'ı üzerinden yapılır.
  access: [{ module: "events", operations: ["write"] }],
  nav: [
    {
      href: "/calendar",
      label: "Takvim",
      labelKey: "calendar",
      icon: CalendarRange,
      group: "main",
      order: 24,
      permission: { definition: calendarPermissions, action: "view" },
    },
  ],
};

export { calendarPermissions };
