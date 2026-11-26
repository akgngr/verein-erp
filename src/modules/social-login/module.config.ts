import { KeyRound } from "lucide-react";
import type { ModuleConfig } from "@/shared/types/module";
import { socialLoginPermissions } from "./permissions";

export const moduleConfig: ModuleConfig = {
  key: "social-login",
  version: "1.0.0",
  label: "Sosyal Giriş",
  description: "Harici kimlik sağlayıcıları ve bağlı hesaplar.",
  category: "OFFICIAL",
  hasSchema: true,
  requires: [{ module: "auth", version: "1.4.0" }],
  access: [{ module: "system", operations: ["read"] }],
  nav: [{ href: "/ayarlar/sosyal-giris", label: "Sosyal Giriş", labelKey: "socialLogin", icon: KeyRound, group: "settings", order: 25, permission: { definition: socialLoginPermissions, action: "view" } }],
};
