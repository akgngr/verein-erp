import { Globe2, Palette } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireUser, setLocaleAction } from "@/modules/auth/server";
import { allModules } from "@/registry";
import { PageHeader } from "@/shared/components/ui/page-header";
import { moduleHome } from "@/shared/navigation/module-nav";
import { can } from "@/shared/permissions/define";

import { LanguageSettingCard } from "../components/language-setting-card";
import {
  DEFAULT_MODULE_SETTINGS_GROUP,
  groupSettingsEntries,
  resolveSettingsGroup,
  settingsPageOrder,
  type SettingsEntryOrder,
} from "@/shared/navigation/settings-groups";

import {
  SettingsHub,
  type SettingsHubItem,
  type SettingsHubSection,
} from "../components/settings-hub";
import { listUsableModuleKeys } from "../services/module-gate";
import { ThemeSettingCard } from "../components/theme-setting-card";

/** Ayar merkezinin kendi adresi; listede tekrar gösterilmez. */
const HUB_HREF = "/ayarlar";
/** Grup bildirmeyen modül ayar sayfalarının grup içi sırası: modülün kendi grup sayfalarından sonra. */
const MODULE_SETTINGS_ORDER = 1000;

/**
 * Ayar merkezi. Kabuk hiçbir modülü tanımaz; liste registry'den kurulur (#611):
 * - `nav` içinde `group: "settings"` olan sayfalar, `settingsGroup` grubunda (varsayılan "general"),
 * - `menu` içinde `key: "settings"` olan öğeler (örn. /muhasebe/ayarlar), `settingsGroup` grubunda
 *   (varsayılan "module-management").
 * Yetki ve etkin modül süzgeci değişmedi; rotalar aynı kaldı.
 */
export async function SettingsOverviewView() {
  const user = await requireUser();
  const t = await getTranslations("settings");
  const tRoot = await getTranslations();

  const activeKeys = new Set(await listUsableModuleKeys());
  const modules = allModules.filter((mod) => activeKeys.has(mod.key));
  const text = (key: string, fallback: string) =>
    tRoot.has(key) ? tRoot(key) : fallback;

  type Entry = SettingsHubItem & SettingsEntryOrder;

  const pages: Entry[] = modules.flatMap((mod) =>
    mod.nav
      .filter(
        (item) =>
          item.group === "settings" && !item.hidden && item.href !== HUB_HREF,
      )
      .filter((item) =>
        can(user.role, item.permission.definition, item.permission.action),
      )
      .map((item) => {
        const Icon = item.icon;
        return {
          ...settingsPageOrder(item),
          key: item.href,
          icon: <Icon className="h-5 w-5" aria-hidden />,
          title: text(`nav.${item.labelKey}`, item.label),
          // #586: Kart başına kendi açıklaması; önceden aynı modülün 6+ kartı modül açıklamasını tekrarlıyordu.
          description: t.has(`itemDescriptions.${item.labelKey}`)
            ? t(`itemDescriptions.${item.labelKey}`)
            : text(`${mod.key}.module.description`, mod.description ?? ""),
        };
      }),
  );

  const pageHrefs = new Set(pages.map((entry) => entry.href));
  const moduleSettings: Entry[] = modules.flatMap((mod) => {
    const home = moduleHome(mod);
    const item = mod.menu?.find((entry) => entry.key === "settings");
    // Ayar sayfası zaten bir grup sayfası olarak listelendiyse (örn. E-posta) tekrar listelenmez.
    if (!home || !item || pageHrefs.has(item.href)) return [];
    const permission = item.permission ?? home.permission;
    if (!can(user.role, permission.definition, permission.action)) return [];
    const Icon = home.icon;
    const moduleName = text(`nav.${home.labelKey}`, home.label);
    return [
      {
        group: resolveSettingsGroup(item.settingsGroup, DEFAULT_MODULE_SETTINGS_GROUP),
        // Eski modüller: grup içinde ayar sayfalarından sonra, modül anahtarına göre (href eşitlik bozar).
        order: item.settingsOrder ?? MODULE_SETTINGS_ORDER,
        key: item.href,
        href: item.href,
        icon: <Icon className="h-5 w-5" aria-hidden />,
        title: t("moduleSettings", { module: moduleName }),
        description: text(
          `${mod.key}.module.description`,
          mod.description ?? "",
        ),
      },
    ];
  });

  // #611: Bölümler registry'deki `settingsGroup` bildirimlerinden kurulur; boş gruplar gösterilmez.
  const sections: SettingsHubSection[] = groupSettingsEntries([
    ...pages,
    ...moduleSettings,
  ]).map(({ group, items }) => ({
    key: group,
    title: t(`groups.${group}.title`),
    description: t(`groups.${group}.description`),
    items: items.map(({ key, href, icon, title, description }) => ({
      key,
      href,
      icon,
      title,
      description,
    })),
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <SettingsHub sections={sections} />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t("sections.personal.title")}
          </h2>
          <p className="text-sm text-ink-500">
            {t("sections.personal.description")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-ink-200/80 bg-surface p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <Globe2 className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("languageSection.title")}
                </h3>
                <p className="text-xs text-ink-400">
                  {t("languageSection.description")}
                </p>
              </div>
            </div>
            <LanguageSettingCard onSetLocale={setLocaleAction} />
          </div>
          <div className="flex flex-col rounded-2xl border border-ink-200/80 bg-surface p-5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <Palette className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("themeSection.title")}
                </h3>
                <p className="text-xs text-ink-400">
                  {t("themeSection.description")}
                </p>
              </div>
            </div>
            <ThemeSettingCard />
          </div>
        </div>
      </section>
    </div>
  );
}
