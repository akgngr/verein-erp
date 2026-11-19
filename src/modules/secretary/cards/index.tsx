import { NotebookPen } from "lucide-react";

import { defineCards } from "@/shared/types/dashboard";

import { secretaryPermissions } from "../permissions";
import { getBriefing } from "../services/briefing";

/**
 * Sekreter "Bugün" kartı (#291). Panelin sağ sütununda üstte sabittir (surface "panel.home", aside);
 * kullanıcı isterse panel ızgarasına da ekleyebilir. Yetki: sekreter görüntüleme; modül kapalıysa
 * kart hiç listelenmez (system yüzeyi modül onayını denetler). Özet her sağlayıcının kendi yetkisiyle
 * sunucuda süzülür; karta yalnız başlık, sayı ve modülün kendi sayfasına bağlantı gelir.
 */
export const cards = defineCards([
  {
    key: "today",
    titleKey: "cards.today.title",
    descriptionKey: "cards.today.description",
    icon: NotebookPen,
    size: "md",
    defaultVisible: false,
    href: "/sekreter",
    surfaces: [{ key: "panel.home", placement: "aside" }],
    permission: { definition: secretaryPermissions, action: "view" },
    render: async ({ user, t }) => {
      const briefing = await getBriefing(user);
      // Gövde ayrı dosyada (next/link içerir); tanım böylece testte ve worker'da yüklenebilir.
      const { TodayCardBody } = await import("./today-body");
      return <TodayCardBody briefing={briefing} t={t} />;
    },
  },
]);
