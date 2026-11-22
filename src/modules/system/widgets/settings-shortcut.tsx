"use client";

import { Settings2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { buttonClassName } from "@/shared/components/kit";

export default function SettingsShortcut() {
  const t = useTranslations("system.ui.widget");
  return (
    <Link href="/ayarlar" className={buttonClassName({ variant: "tertiary", size: "sm", isIconOnly: true })} aria-label={t("settings")} title={t("settings")}>
      <Settings2 className="size-4" aria-hidden />
    </Link>
  );
}
