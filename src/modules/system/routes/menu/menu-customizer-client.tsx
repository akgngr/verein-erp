"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Input } from "@/shared/components/kit";
import type { NavCategoryGroup, UserNavConfig } from "@/shared/navigation/user-nav";

import {
  resetMyNavPreferenceAction,
  saveMyNavPreferenceAction,
} from "../../actions/nav-preferences";

export type MenuCustomizerModuleItem = {
  moduleKey: string;
  labelKey?: string;
  fallbackLabel: string;
  defaultOrder: number;
  defaultParentModule: string | null;
};

type ItemState = {
  categoryId: string | null;
  parentModule: string | null;
  order: number;
  hidden: boolean;
};

function buildInitialItemState(
  items: MenuCustomizerModuleItem[],
  initialConfig: UserNavConfig | null,
): Record<string, ItemState> {
  const overrides = initialConfig?.items ?? {};
  const map: Record<string, ItemState> = {};
  for (const item of items) {
    const ov = overrides[item.moduleKey];
    map[item.moduleKey] = {
      categoryId: ov && "categoryId" in ov ? (ov.categoryId ?? null) : null,
      parentModule:
        ov && "parentModule" in ov ? (ov.parentModule ?? null) : item.defaultParentModule,
      order: typeof ov?.order === "number" ? ov.order : item.defaultOrder,
      hidden: Boolean(ov?.hidden),
    };
  }
  return map;
}

export function MenuCustomizerClient({
  items,
  initialConfig,
}: {
  items: MenuCustomizerModuleItem[];
  initialConfig: UserNavConfig | null;
}) {
  const t = useTranslations("sidebar.customizer");
  const tNav = useTranslations("nav");
  const router = useRouter();

  const [groups, setGroups] = useState<NavCategoryGroup[]>(
    () => initialConfig?.groups ?? [],
  );
  const [itemMap, setItemMap] = useState<Record<string, ItemState>>(() =>
    buildInitialItemState(items, initialConfig),
  );
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const labelFor = (item: MenuCustomizerModuleItem) =>
    item.labelKey && tNav.has(item.labelKey) ? tNav(item.labelKey) : item.fallbackLabel;

  const sortedItems = [...items].sort(
    (a, b) =>
      (itemMap[a.moduleKey]?.order ?? a.defaultOrder) -
        (itemMap[b.moduleKey]?.order ?? b.defaultOrder) ||
      a.moduleKey.localeCompare(b.moduleKey),
  );

  function addCustomGroup() {
    const label = newGroupLabel.trim();
    if (!label) return;
    const id = `custom_${Date.now().toString(36)}`;
    const maxOrder = groups.reduce((acc, g) => Math.max(acc, g.order), 0);
    setGroups((prev) => [...prev, { id, label, order: maxOrder + 10, isCustom: true }]);
    setNewGroupLabel("");
  }

  function removeCustomGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setItemMap((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v.categoryId === id) {
          next[k] = { ...v, categoryId: null };
        }
      }
      return next;
    });
  }

  function moveOrder(moduleKey: string, delta: -1 | 1) {
    const idx = sortedItems.findIndex((n) => n.moduleKey === moduleKey);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sortedItems.length) return;
    const aKey = sortedItems[idx].moduleKey;
    const bKey = sortedItems[swapIdx].moduleKey;
    setItemMap((prev) => {
      const aOrder = prev[aKey]?.order ?? idx * 10;
      const bOrder = prev[bKey]?.order ?? swapIdx * 10;
      const nextAOrder = aOrder === bOrder ? (delta < 0 ? aOrder - 1 : aOrder + 1) : bOrder;
      const nextBOrder = aOrder === bOrder ? aOrder : aOrder;
      return {
        ...prev,
        [aKey]: { ...prev[aKey], order: nextAOrder },
        [bKey]: { ...prev[bKey], order: nextBOrder },
      };
    });
  }

  async function handleSave() {
    setPending(true);
    setStatusMessage(null);
    try {
      const nextConfig: UserNavConfig = {
        groups,
        items: Object.fromEntries(
          Object.entries(itemMap).map(([key, val]) => [
            key,
            {
              categoryId: val.categoryId ?? undefined,
              parentModule: val.parentModule,
              order: val.order,
              hidden: val.hidden,
            },
          ]),
        ),
      };
      const res = await saveMyNavPreferenceAction(nextConfig);
      if (res.ok) {
        setStatusMessage(t("savedMessage"));
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function handleReset() {
    setPending(true);
    setStatusMessage(null);
    try {
      await resetMyNavPreferenceAction();
      setGroups([]);
      setItemMap(buildInitialItemState(items, null));
      setStatusMessage(t("resetMessage"));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-600">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onPress={() => void handleReset()}
            isDisabled={pending}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("resetButton")}
          </Button>
          <Button
            variant="primary"
            onPress={() => void handleSave()}
            isDisabled={pending}
          >
            {t("saveButton")}
          </Button>
        </div>
      </div>

      {statusMessage ? (
        <div
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800"
        >
          {statusMessage}
        </div>
      ) : null}

      {/* İsteğe bağlı özel kategori ekleme */}
      <section className="rounded-2xl border border-ink-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newGroupLabel}
            onChange={(e) => setNewGroupLabel(e.target.value)}
            placeholder={t("newGroupPlaceholder")}
            className="min-w-[240px] flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomGroup();
              }
            }}
          />
          <Button variant="secondary" onPress={addCustomGroup}>
            <Plus className="h-4 w-4" aria-hidden />
            {t("addGroupButton")}
          </Button>
        </div>
        {groups.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {groups.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-800"
              >
                {g.label}
                <button
                  type="button"
                  onClick={() => removeCustomGroup(g.id)}
                  aria-label={t("deleteGroupButton")}
                  className="text-ink-400 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* Modül düzenleme tablosu */}
      <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xs">
        <div className="divide-y divide-ink-100">
          <div className="grid grid-cols-12 gap-3 bg-ink-50 px-4 py-2.5 text-xs font-semibold text-ink-600">
            <div className="col-span-4">{t("moduleColumn")}</div>
            <div className={groups.length > 0 ? "col-span-3" : "hidden"}>{t("categoryColumn")}</div>
            <div className={groups.length > 0 ? "col-span-3" : "col-span-5"}>{t("parentColumn")}</div>
            <div className={groups.length > 0 ? "col-span-2 text-right" : "col-span-3 text-right"}>
              {t("visible")}
            </div>
          </div>

          {sortedItems.map((item, idx) => {
            const state = itemMap[item.moduleKey];
            if (!state) return null;
            const parentCandidates = sortedItems.filter((n) => n.moduleKey !== item.moduleKey);

            return (
              <div
                key={item.moduleKey}
                className="grid grid-cols-12 items-center gap-3 px-4 py-2.5 text-sm"
              >
                <div className="col-span-4 flex items-center gap-2 font-medium text-ink-900">
                  <span className={state.hidden ? "text-ink-400 line-through" : ""}>
                    {labelFor(item)}
                  </span>
                </div>

                {groups.length > 0 ? (
                  <div className="col-span-3">
                    <select
                      aria-label={`${labelFor(item)} ${t("categoryColumn")}`}
                      value={state.categoryId ?? ""}
                      disabled={Boolean(state.parentModule)}
                      onChange={(e) =>
                        setItemMap((prev) => ({
                          ...prev,
                          [item.moduleKey]: {
                            ...prev[item.moduleKey],
                            categoryId: e.target.value || null,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-800 disabled:opacity-50"
                    >
                      <option value="">{t("noCategory")}</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className={groups.length > 0 ? "col-span-3" : "col-span-5"}>
                  <select
                    aria-label={`${labelFor(item)} ${t("parentColumn")}`}
                    value={state.parentModule ?? ""}
                    onChange={(e) =>
                      setItemMap((prev) => ({
                        ...prev,
                        [item.moduleKey]: {
                          ...prev[item.moduleKey],
                          parentModule: e.target.value || null,
                        },
                      }))
                    }
                    className="w-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-800"
                  >
                    <option value="">{t("noParent")}</option>
                    {parentCandidates.map((cand) => (
                      <option key={cand.moduleKey} value={cand.moduleKey}>
                        {labelFor(cand)}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={
                    groups.length > 0
                      ? "col-span-2 flex items-center justify-end gap-1"
                      : "col-span-3 flex items-center justify-end gap-1"
                  }
                >
                  <button
                    type="button"
                    onClick={() => moveOrder(item.moduleKey, -1)}
                    disabled={idx === 0}
                    aria-label={t("moveUp")}
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOrder(item.moduleKey, 1)}
                    disabled={idx === sortedItems.length - 1}
                    aria-label={t("moveDown")}
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setItemMap((prev) => ({
                        ...prev,
                        [item.moduleKey]: {
                          ...prev[item.moduleKey],
                          hidden: !prev[item.moduleKey].hidden,
                        },
                      }))
                    }
                    aria-label={state.hidden ? t("hidden") : t("visible")}
                    className="rounded-lg p-1.5 text-ink-600 hover:bg-ink-100"
                  >
                    {state.hidden ? (
                      <EyeOff className="h-4 w-4 text-ink-400" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4 text-brand-700" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
