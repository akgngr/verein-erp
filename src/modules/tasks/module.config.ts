import { CheckSquare, ListTodo } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { tasksPermissions } from "./permissions";

/**
 * label/description yalnızca yedek metindir; görünen adlar messages/<dil>.json
 * içindeki nav.tasks ve module.{label,description} anahtarlarından gelir.
 */
export const moduleConfig: ModuleConfig = {
  key: "tasks",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Görevler",
  description: "Görev ve iş takibi yönetimi.",
  category: "EXTENSION",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  access: [
    { module: "members", operations: ["read"] },
    { module: "meetings", operations: ["read"] },
  ],
  nav: [
    {
      href: "/tasks",
      label: "Görevler",
      labelKey: "tasks",
      icon: ListTodo,
      group: "main",
      order: 50,
      permission: { definition: tasksPermissions, action: "view" },
    },
  ],
  menu: [
    {
      key: "assignedToMe",
      label: "Bana atananlar",
      href: "/tasks/bana-atananlar",
      icon: CheckSquare,
    },
  ],
};
