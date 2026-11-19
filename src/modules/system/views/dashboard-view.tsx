import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { requireUser } from "@/modules/auth/server";
import { allModules } from "@/registry";
import { moduleHome } from "@/shared/navigation/module-nav";

import Link from "next/link";

import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";

import {
  DashboardBoard,
  type DashboardBoardCard,
} from "../components/dashboard-board";
import { getSetupState } from "../services/setup";
import {
  getDashboardLayout,
  listAvailableDashboardCards,
  listSurfaceCards,
  type AvailableDashboardCard,
} from "../queries/dashboard";
import { SurfaceCards } from "./surface-cards";

/** Panelin sağ sütunu: modüller `surfaces: [{ key: "panel.home", placement: "aside" }]` ile bağlanır. */
export const PANEL_SURFACE = "panel.home";

/**
 * Panel: modüllerin `cards/` klasöründen sunduğu kartlar, kullanıcının kayıtlı düzenine göre.
 * Her kart ayrı ayrı yüklenir; biri hata verirse yalnızca o kart hata mesajı gösterir.
 */
export async function DashboardView() {
  const user = await requireUser();
  const t = await getTranslations("panel");
  const tRoot = await getTranslations();
  const text = (key: string) => (tRoot.has(key) ? tRoot(key) : key);

  const available = await listAvailableDashboardCards(user.role);
  const layout = await getDashboardLayout(user.id, available);
  const byId = new Map(available.map((entry) => [entry.id, entry]));

  const moduleLabel = (moduleKey: string) => {
    const mod = allModules.find((candidate) => candidate.key === moduleKey);
    const home = mod ? moduleHome(mod) : undefined;
    if (!home) return mod?.label ?? moduleKey;
    return home.labelKey && tRoot.has(`nav.${home.labelKey}`)
      ? tRoot(`nav.${home.labelKey}`)
      : home.label;
  };

  const describe = (entry: AvailableDashboardCard): DashboardBoardCard => {
    const Icon = entry.card.icon;
    return {
      id: entry.id,
      title: text(`${entry.moduleKey}.${entry.card.titleKey}`),
      description: text(`${entry.moduleKey}.${entry.card.descriptionKey}`),
      moduleLabel: moduleLabel(entry.moduleKey),
      size: entry.card.size,
      href: entry.card.href,
      icon: <Icon className="h-4.5 w-4.5" aria-hidden />,
    };
  };

  const renderCard = async (
    entry: AvailableDashboardCard,
  ): Promise<{ body: ReactNode | null; failed: boolean }> => {
    try {
      const tModule = await getTranslations(entry.moduleKey);
      const body = await entry.card.render({
        user: { id: user.id, role: user.role },
        t: (key, values) => tModule(key as never, values as never),
      });
      return { body, failed: false };
    } catch (error) {
      console.error(
        `[panel] Kart yüklenemedi (${entry.id}):`,
        error instanceof Error ? error.message : error,
      );
      return { body: null, failed: true };
    }
  };

  const placedEntries = layout.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
  const rendered = await Promise.all(placedEntries.map(renderCard));
  const placed = placedEntries.map((entry, index) => ({
    ...describe(entry),
    ...rendered[index],
  }));
  const placedIds = new Set(layout);
  const addable = available
    .filter((entry) => !placedIds.has(entry.id))
    .map(describe);

  // Kurulum tamamlanmadıysa yöneticiye sihirbaz bandı.
  const setup = can(user.role, systemPermissions, "update")
    ? await getSetupState()
    : null;
  const tSetup = await getTranslations("system.setup");
  const hasAside = (await listSurfaceCards(PANEL_SURFACE, "aside", user.role)).length > 0;

  const board = (
    <DashboardBoard
      title={t("overviewTitle")}
      description={t("overviewDescription")}
      placed={placed}
      available={addable}
    />
  );

  return (
    <>
      {setup && !setup.completedAt ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:bg-brand-500/10">
          <div className="flex flex-col">
            <span className="font-semibold">{tSetup("bannerTitle")}</span>
            <span className="text-sm text-ink-600">{tSetup("bannerText")}</span>
          </div>
          <Link
            href="/ayarlar/kurulum"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            {tSetup("bannerAction")}
          </Link>
        </div>
      ) : null}
      {hasAside ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {/* Mobilde yan sütun önce (üstte), geniş ekranda sağda ve yapışkan. */}
          <aside className="order-1 min-w-0 space-y-6 xl:order-2 xl:sticky xl:top-20 xl:self-start" aria-label={t("asideLabel")}>
            <SurfaceCards surface={PANEL_SURFACE} placement="aside" />
          </aside>
          <div className="order-2 min-w-0 xl:order-1">{board}</div>
        </div>
      ) : (
        board
      )}
    </>
  );
}
