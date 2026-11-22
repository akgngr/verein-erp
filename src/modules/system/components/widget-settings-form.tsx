"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { resetWidgetPreferencesAction, saveWidgetPreferencesAction, type WidgetSettingsRow } from "@/modules/widgets/ui";
import { Button } from "@/shared/components/kit";

type Row = WidgetSettingsRow & { title: string };
type Labels = {
  empty: string; mandatory: string; optional: string; adminDisabled: string; enable: string; disable: string;
  up: string; down: string; reset: string; changed: string; error: string;
  desktop: string; mobile: string; preview: string;
};

/** All submitted IDs came from server-authorized rows; server still validates every save. */
export function WidgetSettingsForm({ initialRows, labels }: { initialRows: Row[]; labels: Labels }) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [rows, setRows] = useState(initialRows);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<"changed" | "error" | null>(null);

  async function save(next: Row[]) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const previous = rows;
    setRows(next);
    setPending(true);
    setMessage(null);
    try {
      const result = await saveWidgetPreferencesAction({ preferences: next.map((row, index) => ({
        id: row.id, enabled: row.mandatory || (!row.adminDisabled && row.enabled), order: index,
      })) });
      if (!result.ok) { setRows(previous); setMessage("error"); return; }
      setMessage("changed");
      router.refresh();
    } catch {
      setRows(previous);
      setMessage("error");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= rows.length || rows[index].slot !== rows[other].slot) return;
    const next = [...rows];
    [next[index], next[other]] = [next[other], next[index]];
    void save(next);
  }

  async function reset() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setMessage(null);
    try {
      const result = await resetWidgetPreferencesAction({});
      setMessage(result.ok ? "changed" : "error");
      if (result.ok) router.refresh();
    } catch {
      setMessage("error");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  const visible = rows.filter((row) => row.slot === "header.right" && row.enabled && !row.adminDisabled);
  return (
    <div className="space-y-5" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" isDisabled={pending} isPending={pending} onPress={() => void reset()}>{labels.reset}</Button>
        {message ? <p role={message === "error" ? "alert" : "status"} className={`text-sm ${message === "error" ? "text-danger" : "text-ink-500"}`}>{labels[message]}</p> : null}
      </div>
      {rows.length === 0 ? <p className="text-sm text-ink-500">{labels.empty}</p> : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200/80 bg-surface p-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{row.title}</h2>
                <p className="text-xs text-ink-500">{row.adminDisabled ? labels.adminDisabled : row.mandatory ? labels.mandatory : labels.optional}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" isDisabled={pending || index === 0 || rows[index - 1].slot !== row.slot} aria-label={`${labels.up}: ${row.title}`} onPress={() => move(index, -1)}>{labels.up}</Button>
                <Button size="sm" variant="secondary" isDisabled={pending || index === rows.length - 1 || rows[index + 1].slot !== row.slot} aria-label={`${labels.down}: ${row.title}`} onPress={() => move(index, 1)}>{labels.down}</Button>
                <Button size="sm" variant="secondary" isDisabled={pending || row.mandatory || row.adminDisabled} aria-label={`${row.enabled ? labels.disable : labels.enable}: ${row.title}`} onPress={() => void save(rows.map((item) => item.id === row.id ? { ...item, enabled: !item.enabled } : item))}>{row.enabled ? labels.disable : labels.enable}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <section aria-label={labels.preview} className="grid gap-4 lg:grid-cols-2">
        {(["desktop", "mobile"] as const).map((viewport) => (
          <div key={viewport} className="rounded-xl border border-ink-200/80 bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">{labels[viewport]}</h2>
            <div className={`flex min-h-12 items-center gap-2 overflow-x-auto rounded-lg border border-ink-200/80 p-2 ${viewport === "mobile" ? "max-w-72" : "w-full"}`}>
              {visible.length ? visible.map((row) => <span key={row.id} className="shrink-0 rounded-md bg-ink-100 px-2 py-1 text-xs dark:bg-ink-800">{row.title}</span>) : <span className="text-xs text-ink-500">{labels.empty}</span>}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
