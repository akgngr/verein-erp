import { MessageSquareWarning } from "lucide-react";

import type { ModuleConfig } from "@/shared/types/module";

import { feedbackPermissions } from "./permissions";

/** Test aşaması için hata ve öneri kaydı: sağ altta yüzen buton + yönetici listesi. */
export const moduleConfig: ModuleConfig = {
  key: "feedback",
  label: "Geri bildirim",
  description: "Test kullanıcılarının hata ve önerilerini toplar.",
  category: "OFFICIAL",
  hasSchema: true,
  // Yüzen buton yalnızca modül etkinken çizilir (modül durumunu okur).
  access: [{ module: "system", operations: ["read"] }],
  nav: [
    {
      href: "/geri-bildirim",
      label: "Geri bildirim",
      labelKey: "geriBildirim",
      icon: MessageSquareWarning,
      group: "main",
      order: 95,
      permission: { definition: feedbackPermissions, action: "view" },
    },
  ],
};
