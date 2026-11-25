"use client";

import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { resetWidgetPreferencesAction, saveWidgetPreferencesAction, setWidgetPolicyAction, type WidgetSettingsRow } from "@/modules/widgets/ui";
import { Button, Switch } from "@/shared/components/kit";

type Row = WidgetSettingsRow & { title: string };
const ordered = (rows: Row[]) => [...rows].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function WidgetSettingsForm({ initialRows, canManagePolicy = false }: { initialRows: Row[]; canManagePolicy?: boolean }) {
  const t = useTranslations("system.ui.widgetSettings");
  const router = useRouter();
  const pendingRef = useRef(false);
  const [rows, setRows] = useState(() => ordered(initialRows));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<"saved" | "reset" | "failed" | null>(null);

  async function persist(next: Row[], reset = false) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const previous = rows;
    setRows(next);
    setPending(true);
    setMessage(null);
    try {
      const result = reset
        ? await resetWidgetPreferencesAction({})
        : await saveWidgetPreferencesAction({ preferences: ordered(next).filter((row) => !row.adminDisabled).map(({ id, enabled }, order) => ({ id, enabled, order })) });
      if (!result.ok) throw new Error();
      setMessage(reset ? "reset" : "saved");
      router.refresh();
    } catch {
      setRows(previous);
      setMessage("failed");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  /** #583: Yönetici bir widget'ı herkes için kapatır/açar (zorunlu widget'lar hariç; sunucu da reddeder). */
  async function setPolicy(row: Row, disabled: boolean) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage(null);
    try {
      const result = await setWidgetPolicyAction({ widgetId: row.id, disabled });
      if (!result.ok) throw new Error();
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, adminDisabled: disabled } : item)));
      setMessage("saved");
      router.refresh();
    } catch {
      setMessage("failed");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function move(id: string, direction: number) {
    const next = ordered(rows);
    const at = next.findIndex((row) => row.id === id);
    const target = at + direction;
    if (at < 0 || target < 0 || target >= next.length || next[at].slot !== next[target].slot) return;
    [next[at], next[target]] = [next[target], next[at]];
    void persist(next.map((row, index) => ({ ...row, order: index })));
  }

  const active = ordered(rows).filter((row) => row.enabled && !row.adminDisabled);
  return (
    <div className="space-y-6" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500">{t("hint")}</p>
        <Button variant="secondary" isDisabled={pending || rows.length === 0} onPress={() => void persist(ordered(rows.map((row) => ({ ...row, enabled: !row.adminDisabled && row.defaultEnabled, order: row.defaultOrder }))), true)}>
          <RotateCcw className="size-4" aria-hidden /> {t("reset")}
        </Button>
      </div>
      {message ? <p role={message === "failed" ? "alert" : "status"} className={message === "failed" ? "text-sm text-danger" : "text-sm text-success"}>{t(message === "reset" ? "resetSuccess" : message)}</p> : null}
      {rows.length === 0 ? <p className="rounded-xl border border-ink-200 bg-surface p-5 text-sm text-ink-500">{t("empty")}</p> : null}
      <ul className="space-y-3" aria-label={t("list")}>
        {ordered(rows).map((row, index) => {
          const locked = row.mandatory || row.adminDisabled;
          return (
            <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-surface p-4 shadow-xs">
              <div className="min-w-40 flex-1">
                <p className="font-medium text-foreground">{row.title}</p>
                <p className="text-xs text-ink-500">{t(`slots.${row.slot}`)} · {row.mandatory ? t("mandatory") : row.adminDisabled ? t("adminDisabled") : t("optional")}</p>
              </div>
              <Switch isSelected={row.enabled} isDisabled={pending || locked} onChange={(enabled) => void persist(rows.map((item) => item.id === row.id ? { ...item, enabled } : item))}>
                <span className="sr-only">{t("toggle", { title: row.title })}</span>
              </Switch>
              {canManagePolicy && !row.mandatory ? (
                <Switch isSelected={!row.adminDisabled} isDisabled={pending} onChange={(allowed) => void setPolicy(row, !allowed)}>
                  <span className="text-xs text-ink-600">{t("policy.label")}</span>
                  <span className="sr-only">{t("policy.toggle", { title: row.title })}</span>
                </Switch>
              ) : null}
              <div className="flex gap-1">
                <Button variant="tertiary" size="sm" isIconOnly aria-label={t("moveUp", { title: row.title })} isDisabled={pending || index === 0 || ordered(rows)[index - 1].slot !== row.slot} onPress={() => move(row.id, -1)}><ArrowUp className="size-4" aria-hidden /></Button>
                <Button variant="tertiary" size="sm" isIconOnly aria-label={t("moveDown", { title: row.title })} isDisabled={pending || index === rows.length - 1 || ordered(rows)[index + 1].slot !== row.slot} onPress={() => move(row.id, 1)}><ArrowDown className="size-4" aria-hidden /></Button>
              </div>
            </li>
          );
        })}
      </ul>
      <section aria-label={t("preview")} className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t("preview")}</h2>
        {(["desktop", "mobile"] as const).map((device) => (
          <div key={device} className="space-y-2">
            <p className="text-sm text-ink-500">{t(device)}</p>
            <div className={`flex min-h-14 items-center justify-end gap-2 rounded-xl border border-ink-200 bg-surface px-4 ${device === "mobile" ? "max-w-xs" : "w-full"}`}>
              {active.filter((row) => row.slot === "header.right").length === 0
                ? <span className="text-sm text-ink-500">{t("noHeaderWidgets")}</span>
                : active.filter((row) => row.slot === "header.right").map((row) => <span key={row.id} className="rounded-lg border border-ink-200 px-2 py-1 text-xs text-foreground">{row.title}</span>)}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
