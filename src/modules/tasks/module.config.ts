import { CheckSquare, ListTodo } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { tasksPermissions } from "./permissions";

/**
 * label/description yalnızca yedek metindir; görünen adlar messages/<dil>.json
 * içindeki nav.tasks ve module.{label,description} anahtarlarından gelir.
 */
export const moduleConfig: ModuleConfig = {
  key: "tasks",
  label: "Görevler",
  description: "Görev ve iş takibi yönetimi.",
  category: "EXTENSION",
  hasSchema: true,
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
