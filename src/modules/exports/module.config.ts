import { FolderDown } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { exportsPermissions } from "./permissions";

/** label/description yalnızca yedektir; görünen adlar messages/<dil>.json'dan gelir. */
export const moduleConfig: ModuleConfig = {
  key: "exports",
  label: "Dosyalarım",
  description: "Oluşturulan PDF, Excel, Word, Markdown ve CSV dosyaları; şifreli saklanır.",
  category: "OFFICIAL",
  hasSchema: true,
  // PDF antetinde dernek adı, adresi ve logosu.
  access: [{ module: "organization", operations: ["read"] }],
  // Word çıktısı için; `pnpm module:deps` kök package.json'a ekler.
  dependencies: { docx: "^9.15.0" },
  nav: [
    {
      href: "/dosyalar",
      label: "Dosyalarım",
      labelKey: "exports",
      icon: FolderDown,
      group: "main",
      order: 90,
      permission: { definition: exportsPermissions, action: "view" },
    },
  ],
};
