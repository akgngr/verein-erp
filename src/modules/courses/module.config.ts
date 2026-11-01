import { BookOpen, ClipboardCheck, Coins, GraduationCap, HandCoins, Presentation, Settings2 } from "lucide-react";

import { progressPermissions } from "@/modules/progress";
import { studentsPermissions } from "@/modules/students";

import type { ModuleConfig } from "@/shared/types/module";

import { courseFeesPermissions, coursePayoutsPermissions, coursesPermissions, courseTeachersPermissions } from "./permissions";

/** label/description yalnızca yedektir; görünen adlar messages/<dil>.json'dan gelir. */
export const moduleConfig: ModuleConfig = {
  key: "courses",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.3.0",
  label: "Kurslar",
  description: "Gönüllü kurslar ve Nachhilfe: öğretmenler, dersler, kayıtlar, ücretler ve muhasebe aktarımı.",
  category: "OFFICIAL",
  hasSchema: true,
  // Başka modüllerden istenen erişim (yönetici onayı gerekir; gerekçe: messages → access.<modül>).
  // Zorunlu: kurs kayıtları öğrenci kaydına bağlıdır. Önerilen: yoklama/not/veli raporu.
  requires: [{ module: "students" }],
  recommends: ["progress"],
  access: [
    { module: "accounting", operations: ["read", "write"] },
    { module: "mail", operations: ["read", "write"] },
    { module: "organization", operations: ["read"] },
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
      key: "students",
      label: "Öğrenciler",
      href: "/ogrenciler",
      icon: GraduationCap,
      module: "students",
      permission: { definition: studentsPermissions, action: "view" },
    },
    {
      key: "progress",
      label: "Öğrenci takibi",
      href: "/ogrenci-takibi",
      icon: ClipboardCheck,
      module: "progress",
      permission: { definition: progressPermissions, action: "view" },
    },
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
      key: "payouts",
      label: "Öğretmen hakedişleri",
      href: "/kurslar/hakedisler",
      icon: HandCoins,
      permission: { definition: coursePayoutsPermissions, action: "view" },
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
