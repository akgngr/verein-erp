import { BookOpen, Coins, Presentation, Settings2 } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { courseFeesPermissions, coursesPermissions, courseTeachersPermissions } from "./permissions";

/** label/description yalnızca yedektir; görünen adlar messages/<dil>.json'dan gelir. */
export const moduleConfig: ModuleConfig = {
  key: "courses",
  label: "Kurslar",
  description: "Gönüllü kurslar ve Nachhilfe: öğretmenler, dersler, kayıtlar, ücretler ve muhasebe aktarımı.",
  category: "OFFICIAL",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  access: [
    { module: "accounting", operations: ["read", "write"] },
    { module: "mail", operations: ["read", "write"] },
    { module: "students", operations: ["read"] },
    { module: "users", operations: ["read", "write"] },
  ],
  // Öğretmen rolü bu modülle gelir: modül pasifse rol atanamaz ve öğretmenlerin izni olmaz.
  roles: [{ key: "TEACHER", color: "secondary" }],
  nav: [
    {
      href: "/kurslar",
      label: "Kurslar",
      labelKey: "courses",
      icon: BookOpen,
      group: "main",
      order: 28,
      permission: { definition: coursesPermissions, action: "view" },
    },
  ],
  menu: [
    {
      key: "teachers",
      label: "Öğretmenler",
      href: "/kurslar/ogretmenler",
      icon: Presentation,
      permission: { definition: courseTeachersPermissions, action: "view" },
    },
    {
      key: "fees",
      label: "Ücretler ve tahsilat",
      href: "/kurslar/odemeler",
      icon: Coins,
      permission: { definition: courseFeesPermissions, action: "view" },
    },
    {
      key: "settings",
      label: "Ayarlar",
      href: "/kurslar/ayarlar",
      icon: Settings2,
      permission: { definition: courseFeesPermissions, action: "update" },
    },
  ],
};
