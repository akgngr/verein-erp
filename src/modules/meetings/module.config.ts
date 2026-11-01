import { CalendarDays, ListTodo } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";
import { meetingsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "meetings",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Toplantılar",
  description: "Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar.",
  category: "OFFICIAL",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  access: [
    { module: "members", operations: ["read"] },
    { module: "organization", operations: ["read"] },
  ],
  nav: [
    {
      href: "/toplantilar",
      label: "Toplantılar",
      labelKey: "toplantilar",
      icon: CalendarDays,
      group: "main",
      order: 2,
      permission: { definition: meetingsPermissions, action: "view" },
    },
  ],
  menu: [
    { key: "tasks", label: "Görevler", href: "/toplantilar/gorevler", icon: ListTodo },
  ],
};
