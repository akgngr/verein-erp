import type { ModuleConfig } from "@/shared/types/module";

export const moduleConfig: ModuleConfig = {
  key: "auth",
  // Modül sürümü: releases.json en üstteki sürümle aynı olmalı (modülde her değişiklikte artırın).
  version: "1.0.0",
  label: "Kimlik Doğrulama",
  description: "Kullanıcı girişi, oturum yönetimi ve parola güvenliği.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  // Menüde görünmeyen profil sayfası (/profil) bu köke bağlanır.
  basePath: "/profil",
  nav: [],
};
