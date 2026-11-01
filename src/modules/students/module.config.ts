import { Download, GraduationCap, Settings2, UsersRound } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { studentsDatevPermissions, studentsPermissions } from "./permissions";

/** label/description yalnızca yedektir; görünen adlar messages/<dil>.json'dan gelir. */
export const moduleConfig: ModuleConfig = {
  key: "students",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.1.0",
  label: "Öğrenciler",
  description: "Kurs ve Nachhilfe öğrencileri, veliler ve DATEV uyumlu borçlu (Debitor) kayıtları.",
  category: "OFFICIAL",
  hasSchema: true,
  nav: [
    {
      href: "/ogrenciler",
      label: "Öğrenciler",
      labelKey: "students",
      icon: GraduationCap,
      group: "main",
      order: 30,
      permission: { definition: studentsPermissions, action: "view" },
      // Ana menüde değil, Kurslar menüsünde gösterilir (kurslarla ilişkili; menü kalabalığı olmasın).
      hidden: true,
    },
  ],
  menu: [
    { key: "guardians", label: "Veliler", href: "/ogrenciler/veliler", icon: UsersRound },
    {
      key: "datevExport",
      label: "DATEV Debitoren",
      href: "/api/students/datev-debitoren",
      icon: Download,
      isDownload: true,
      permission: { definition: studentsDatevPermissions, action: "view" },
    },
    {
      key: "settings",
      label: "Ayarlar",
      href: "/ogrenciler/ayarlar",
      icon: Settings2,
      permission: { definition: studentsDatevPermissions, action: "view" },
    },
  ],
};
