import {
  Boxes,
  Building2,
  Calculator,
  ChevronRight,
  Globe2,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/modules/auth/server";
import { PageHeader } from "@/shared/components/ui/page-header";
import { can } from "@/shared/permissions/define";
import { organizationPermissions } from "@/modules/organization";
import { usersPermissions } from "@/modules/users";
import { auditPermissions } from "@/modules/audit";
import { systemPermissions } from "@/shared/permissions/system";
import { accountingPermissions } from "@/modules/accounting";
import { cn } from "@/shared/utils";

import { LanguageSettingCard } from "../components/language-switcher";

export async function SettingsOverviewView() {
  const user = await requireUser();
  const t = await getTranslations("settings");

  // Yetki kontrolleri
  const canOrg = can(user.role, organizationPermissions, "view");
  const canUsers = can(user.role, usersPermissions, "view");
  const canSystem = can(user.role, systemPermissions, "view");
  const canAudit = can(user.role, auditPermissions, "view");
  const canAccounting = can(user.role, accountingPermissions, "view");

  const cards = [
    {
      key: "organization",
      href: "/ayarlar/dernek",
      icon: Building2,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      title: t("cards.organization.title"),
      description: t("cards.organization.description"),
      actionLabel: t("cards.organization.action"),
      allowed: canOrg,
      badge: "Profil & Kimlik",
    },
    {
      key: "users",
      href: "/ayarlar/kullanicilar",
      icon: Users,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      title: t("cards.users.title"),
      description: t("cards.users.description"),
      actionLabel: t("cards.users.action"),
      allowed: canUsers,
      badge: "Erişim & Roller",
    },
    {
      key: "modules",
      href: "/ayarlar/moduller",
      icon: Boxes,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      title: t("cards.modules.title"),
      description: t("cards.modules.description"),
      actionLabel: t("cards.modules.action"),
      allowed: canSystem,
      badge: "Modüller & Şema",
    },
    {
      key: "audit",
      href: "/ayarlar/denetim-kaydi",
      icon: ShieldAlert,
      color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
      title: t("cards.audit.title"),
      description: t("cards.audit.description"),
      actionLabel: t("cards.audit.action"),
      allowed: canAudit,
      badge: "Güvenlik & Log",
    },
    {
      key: "accounting",
      href: "/muhasebe/ayarlar",
      icon: Calculator,
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      title: t("cards.accounting.title"),
      description: t("cards.accounting.description"),
      actionLabel: t("cards.accounting.action"),
      allowed: canAccounting,
      badge: "Mali Yapı",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      {/* 1. Dil ve Bölge Yapılandırması */}
      <section className="p-5 rounded-2xl border border-default-200/80 bg-content1 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-300 flex items-center justify-center">
            <Globe2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-small font-semibold text-foreground">
              {t("languageSection.title")}
            </h3>
            <p className="text-tiny text-default-400">
              {t("languageSection.description")}
            </p>
          </div>
        </div>
        <LanguageSettingCard />
      </section>

      {/* 2. Sistem & Yönetim Ayar Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards
          .filter((card) => card.allowed)
          .map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.key}
                href={card.href}
                className="group p-5 rounded-2xl border border-default-200/80 bg-content1 hover:bg-default-50/80 hover:border-default-300 shadow-xs transition-all duration-200 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        card.color,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-small font-bold text-foreground group-hover:text-primary transition-colors">
                          {card.title}
                        </h4>
                        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-default-100 text-default-500">
                          {card.badge}
                        </span>
                      </div>
                      <p className="text-tiny text-default-500 mt-1 line-clamp-2">
                        {card.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-default-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                <div className="pt-3 border-t border-default-100 flex items-center justify-between text-tiny text-default-400 font-medium">
                  <span className="font-mono text-[11px] text-default-400">
                    {card.href}
                  </span>
                  <span className="text-primary font-semibold flex items-center gap-1 group-hover:underline">
                    {card.actionLabel} &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
