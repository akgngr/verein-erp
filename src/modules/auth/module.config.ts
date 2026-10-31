import type { ModuleConfig } from "@/shared/types/module";

export const moduleConfig: ModuleConfig = {
  key: "auth",
  label: "Kimlik Doğrulama",
  description: "Kullanıcı girişi, oturum yönetimi ve parola güvenliği.",
  category: "CORE",
  isProtected: true,
  hasSchema: true,
  // Menüde görünmeyen profil sayfası (/profil) bu köke bağlanır.
  basePath: "/profil",
  nav: [],
};
