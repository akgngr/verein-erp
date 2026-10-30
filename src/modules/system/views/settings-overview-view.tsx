import { Globe2, Palette } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireUser, setLocaleAction } from "@/modules/auth/server";
import { allModules } from "@/registry";
import { PageHeader } from "@/shared/components/ui/page-header";
import { getAllActiveModuleKeys } from "@/shared/modules/module-store";
import { moduleHome } from "@/shared/navigation/module-nav";
import { can } from "@/shared/permissions/define";

import { LanguageSettingCard } from "../components/language-setting-card";
import { SettingsHub, type SettingsHubSection } from "../components/settings-hub";
import { ThemeSettingCard } from "../components/theme-setting-card";

/** Ayar merkezinin kendi adresi; listede tekrar gösterilmez. */
const HUB_HREF = "/ayarlar";

/**
 * Ayar merkezi. Kabuk hiçbir modülü tanımaz; liste registry'den kurulur:
 * - "Dernek ve sistem": `nav` içinde `group: "settings"` olan sayfalar,
 * - "Modül ayarları": `menu` içinde `key: "settings"` olan öğeler (örn. /muhasebe/ayarlar).
 */
export async function SettingsOverviewView() {
  const user = await requireUser();
  const t = await getTranslations("settings");
  const tRoot = await getTranslations();

  const activeKeys = new Set(getAllActiveModuleKeys(allModules.map((mod) => mod.key)));
  const modules = allModules.filter((mod) => activeKeys.has(mod.key));
  const text = (key: string, fallback: string) => (tRoot.has(key) ? tRoot(key) : fallback);

  const general = modules
    .flatMap((mod) =>
      mod.nav
        .filter((item) => item.group === "settings" && item.href !== HUB_HREF)
        .filter((item) => can(user.role, item.permission.definition, item.permission.action))
        .map((item) => ({ mod, item })),
    )
    .sort((a, b) => a.item.order - b.item.order)
    .map(({ mod, item }) => {
      const Icon = item.icon;
      return {
        key: item.href,
        href: item.href,
        icon: <Icon className="h-5 w-5" aria-hidden />,
        title: text(`nav.${item.labelKey}`, item.label),
        description: text(`${mod.key}.module.description`, mod.description ?? ""),
      };
    });

  const generalHrefs = new Set(general.map((entry) => entry.href));
  const moduleSettings = modules.flatMap((mod) => {
    const home = moduleHome(mod);
    const item = mod.menu?.find((entry) => entry.key === "settings");
    // Ayar sayfası zaten "Dernek ve sistem" bölümündeyse (örn. E-posta) tekrar listelenmez.
    if (!home || !item || generalHrefs.has(item.href)) return [];
    const permission = item.permission ?? home.permission;
    if (!can(user.role, permission.definition, permission.action)) return [];
    const Icon = home.icon;
    const moduleName = text(`nav.${home.labelKey}`, home.label);
    return [
      {
        key: item.href,
        href: item.href,
        icon: <Icon className="h-5 w-5" aria-hidden />,
        title: t("moduleSettings", { module: moduleName }),
        description: text(`${mod.key}.module.description`, mod.description ?? ""),
      },
    ];
  });

  const sections: SettingsHubSection[] = [
    { key: "general", title: t("sections.general.title"), description: t("sections.general.description"), items: general },
    { key: "modules", title: t("sections.modules.title"), description: t("sections.modules.description"), items: moduleSettings },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <SettingsHub sections={sections} />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-medium font-semibold text-foreground">{t("sections.personal.title")}</h2>
          <p className="text-small text-default-500">{t("sections.personal.description")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-default-200/80 bg-content1 p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                <Globe2 className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h3 className="text-small font-semibold text-foreground">{t("languageSection.title")}</h3>
                <p className="text-tiny text-default-400">{t("languageSection.description")}</p>
              </div>
            </div>
            <LanguageSettingCard onSetLocale={setLocaleAction} />
          </div>
          <div className="flex flex-col rounded-2xl border border-default-200/80 bg-content1 p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                <Palette className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h3 className="text-small font-semibold text-foreground">{t("themeSection.title")}</h3>
                <p className="text-tiny text-default-400">{t("themeSection.description")}</p>
              </div>
            </div>
            <ThemeSettingCard />
          </div>
        </div>
      </section>
    </div>
  );
}
