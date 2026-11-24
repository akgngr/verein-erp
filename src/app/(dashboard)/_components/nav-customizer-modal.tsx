"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Input } from "@/shared/components/kit";
import type {
  NavCategoryGroup,
  ResolvedNavCategory,
  ResolvedNavNode,
  UserNavConfig,
} from "@/shared/navigation/user-nav";

import {
  resetMyNavPreferenceAction,
  saveMyNavPreferenceAction,
} from "../_actions/nav-preferences";

export function NavCustomizerModal({
  open,
  onClose,
  allItems,
  categories,
  initialConfig,
  labelForItem,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  allItems: ResolvedNavNode[];
  categories: ResolvedNavCategory[];
  initialConfig: UserNavConfig | null;
  labelForItem: (node: ResolvedNavNode) => string;
  onSaved: (next: UserNavConfig | null) => void;
}) {
  const t = useTranslations("sidebar.customizer");
  const router = useRouter();

  const [groups, setGroups] = useState<NavCategoryGroup[]>(() =>
    categories.map((c) => ({
      id: c.id,
      label: c.label,
      order: c.order,
      collapsedByDefault: c.collapsedByDefault,
      isCustom: c.isCustom,
    })),
  );
  const [items, setItems] = useState<Record<string, { categoryId: string; parentModule: string | null; order: number; hidden: boolean }>>(() => {
    const map: Record<string, { categoryId: string; parentModule: string | null; order: number; hidden: boolean }> = {};
    for (const node of allItems) {
      map[node.moduleKey] = {
        categoryId: node.categoryId,
        parentModule: node.parentModule,
        order: node.order,
        hidden: node.hidden,
      };
    }
    return map;
  });
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [pending, setPending] = useState(false);

  if (!open) return null;

  const sortedNodes = [...allItems].sort(
    (a, b) => (items[a.moduleKey]?.order ?? a.order) - (items[b.moduleKey]?.order ?? b.order),
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
    setItems((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v.categoryId === id) {
          next[k] = { ...v, categoryId: "association" };
        }
      }
      return next;
    });
  }

  function moveOrder(moduleKey: string, delta: -1 | 1) {
    const idx = sortedNodes.findIndex((n) => n.moduleKey === moduleKey);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sortedNodes.length) return;
    const aKey = sortedNodes[idx].moduleKey;
    const bKey = sortedNodes[swapIdx].moduleKey;
    setItems((prev) => {
      const aOrder = prev[aKey]?.order ?? idx * 10;
      const bOrder = prev[bKey]?.order ?? swapIdx * 10;
      const resolvedA = aOrder === bOrder ? idx * 10 : aOrder;
      const resolvedB = aOrder === bOrder ? swapIdx * 10 : bOrder;
      return {
        ...prev,
        [aKey]: { ...prev[aKey], order: resolvedB },
        [bKey]: { ...prev[bKey], order: resolvedA },
      };
    });
  }

  async function handleSave() {
    setPending(true);
    try {
      const nextConfig: UserNavConfig = {
        groups: groups.filter((g) => g.isCustom),
        items,
        collapsedGroupIds: initialConfig?.collapsedGroupIds,
      };
      const res = await saveMyNavPreferenceAction(nextConfig);
      if (res.ok) {
        onSaved(res.config);
        router.refresh();
        onClose();
      }
    } finally {
      setPending(false);
    }
  }

  async function handleReset() {
    setPending(true);
    try {
      await resetMyNavPreferenceAction();
      onSaved(null);
      router.refresh();
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-ink-200 bg-surface shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink-900">{t("title")}</h2>
            <p className="text-xs text-ink-500">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("cancelButton")}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-56 flex-1">
              <Input
                value={newGroupLabel}
                onChange={(e) => setNewGroupLabel(e.target.value)}
                placeholder={t("newGroupPlaceholder")}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              isDisabled={!newGroupLabel.trim() || pending}
              onPress={addCustomGroup}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t("addGroupButton")}
            </Button>
          </div>

          {groups.some((g) => g.isCustom) ? (
            <div className="flex flex-wrap gap-2">
              {groups
                .filter((g) => g.isCustom)
                .map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-800"
                  >
                    {g.label}
                    <button
                      type="button"
                      onClick={() => removeCustomGroup(g.id)}
                      aria-label={t("deleteGroupButton")}
                      className="text-ink-400 hover:text-danger-600"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                ))}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-ink-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink-50 text-ink-600">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("moduleColumn")}</th>
                  <th className="px-3 py-2 font-medium">{t("categoryColumn")}</th>
                  <th className="px-3 py-2 font-medium">{t("parentColumn")}</th>
                  <th className="px-3 py-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {sortedNodes.map((node, index) => {
                  const cfg = items[node.moduleKey];
                  return (
                    <tr key={node.moduleKey} className={cfg?.hidden ? "opacity-55" : ""}>
                      <td className="px-3 py-2 font-medium text-ink-900">
                        {labelForItem(node)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          aria-label={t("categoryColumn")}
                          value={cfg?.categoryId ?? "association"}
                          onChange={(e) =>
                            setItems((prev) => ({
                              ...prev,
                              [node.moduleKey]: {
                                ...prev[node.moduleKey],
                                categoryId: e.target.value,
                              },
                            }))
                          }
                          className="h-8 rounded-lg border border-ink-200 bg-surface px-2 text-xs text-ink-900"
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          aria-label={t("parentColumn")}
                          value={cfg?.parentModule ?? ""}
                          onChange={(e) =>
                            setItems((prev) => ({
                              ...prev,
                              [node.moduleKey]: {
                                ...prev[node.moduleKey],
                                parentModule: e.target.value || null,
                              },
                            }))
                          }
                          className="h-8 rounded-lg border border-ink-200 bg-surface px-2 text-xs text-ink-900"
                        >
                          <option value="">{t("noParent")}</option>
                          {allItems
                            .filter((other) => other.moduleKey !== node.moduleKey)
                            .map((other) => (
                              <option key={other.moduleKey} value={other.moduleKey}>
                                {labelForItem(other)}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveOrder(node.moduleKey, -1)}
                            aria-label={t("moveUp")}
                            className="rounded p-1 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled={index === sortedNodes.length - 1}
                            onClick={() => moveOrder(node.moduleKey, 1)}
                            aria-label={t("moveDown")}
                            className="rounded p-1 text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setItems((prev) => ({
                                ...prev,
                                [node.moduleKey]: {
                                  ...prev[node.moduleKey],
                                  hidden: !prev[node.moduleKey]?.hidden,
                                },
                              }))
                            }
                            aria-label={cfg?.hidden ? t("hidden") : t("visible")}
                            className="rounded p-1 text-ink-600 hover:bg-ink-100"
                          >
                            {cfg?.hidden ? (
                              <EyeOff className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200 px-5 py-3">
          <Button type="button" size="sm" variant="secondary" isDisabled={pending} onPress={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t("resetButton")}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" isDisabled={pending} onPress={onClose}>
              {t("cancelButton")}
            </Button>
            <Button type="button" size="sm" isDisabled={pending} onPress={handleSave}>
              {t("saveButton")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
