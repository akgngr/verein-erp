import { getTranslations } from "next-intl/server";

import { requireUser } from "@/modules/auth/server";
import { getUserNavPreference } from "@/modules/users/server";
import { registry } from "@/registry";
import { MODULE_NAV_DEFAULTS } from "@/shared/navigation/nav-defaults.generated";
import { can } from "@/shared/permissions/define";

import { listUsableModuleKeys } from "../../server";
import { MenuCustomizerClient, type MenuCustomizerModuleItem } from "./menu-customizer-client";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("sidebar.customizer");
  return { title: t("title") };
}

export default async function MenuSettingsPage() {
  const user = await requireUser();
  const [activeModuleKeys, initialConfig] = await Promise.all([
    listUsableModuleKeys(),
    getUserNavPreference(user.id).catch(() => null),
  ]);

  const items: MenuCustomizerModuleItem[] = registry
    .filter((mod) => activeModuleKeys.includes(mod.key))
    .flatMap((mod) => {
      const mainNav = mod.nav.find(
        (item) =>
          !item.hidden &&
          item.group === "main" &&
          item.href !== "/" &&
          can(user.role, item.permission.definition, item.permission.action),
      );
      if (!mainNav) return [];
      const def = MODULE_NAV_DEFAULTS[mod.key];
      return [
        {
          moduleKey: mod.key,
          labelKey: mainNav.labelKey,
          fallbackLabel: mainNav.label,
          defaultOrder: def?.order ?? mainNav.order,
          defaultParentModule: mainNav.parentModule ?? def?.parentModule ?? null,
        },
      ];
    })
    .sort((a, b) => a.defaultOrder - b.defaultOrder || a.moduleKey.localeCompare(b.moduleKey));

  return <MenuCustomizerClient items={items} initialConfig={initialConfig} />;
}
