import { FileText } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { documentsPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "documents",
  label: "Evrak Kayıt",
  nav: [
    {
      href: "/evrak",
      label: "Evrak Kayıt",
      icon: FileText,
      group: "main",
      order: 1,
      permission: { definition: documentsPermissions, action: "view" },
    },
  ],
};
