"use client";

import { addToast, Button, Input, Select, SelectItem, Switch } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { createScheduleAction, deleteScheduleAction, toggleScheduleAction } from "../actions/automation-actions";

export type ScheduleRow = {
  id: string;
  taskKey: string;
  intervalMinutes: number;
  enabled: boolean;
  nextRun: string;
  lastRun: string | null;
};

type Props = {
  schedules: ScheduleRow[];
  tasks: { key: string; minIntervalMinutes: number }[];
  canManage: boolean;
};

/** Yalnızca güvenilir kodda `schedule` bildiren görevler zamanlanabilir; kullanıcı yalnızca aralığı seçer. */
export function SchedulesPanel({ schedules, tasks, canManage }: Props) {
  const t = useTranslations("automation.schedules");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [taskKey, setTaskKey] = useState(tasks[0]?.key ?? "");
  const [hours, setHours] = useState("24");

  const run = (promise: () => Promise<{ ok: boolean; error?: string }>, success: string) => startTransition(async () => {
    const response = await promise();
    if (!response.ok) return void addToast({ title: response.error, color: "danger" });
    addToast({ title: success, color: "success" });
    router.refresh();
  });

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-medium font-semibold">{t("title")}</h2>
        <p className="text-small text-default-500">{t("description")}</p>
      </div>

      {canManage && tasks.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-large border border-default-200 bg-content1 p-4">
          <Select label={t("task")} size="sm" className="max-w-xs" selectedKeys={taskKey ? [taskKey] : []}
            onSelectionChange={(keys) => setTaskKey(String(Array.from(keys)[0] ?? ""))}>
            {tasks.map((task) => <SelectItem key={task.key}>{task.key}</SelectItem>)}
          </Select>
          <Input label={t("intervalHours")} size="sm" type="number" min={1} className="max-w-[10rem]" value={hours} onValueChange={setHours} />
          <Button color="primary" size="md" isLoading={pending} startContent={<Plus className="h-4 w-4" />} isDisabled={!taskKey}
            onPress={() => run(() => createScheduleAction({ taskKey, intervalMinutes: Math.round(Number(hours) * 60) }), t("created"))}>
            {t("add")}
          </Button>
        </div>
      ) : null}

      {schedules.length === 0 ? (
        <p className="rounded-large border border-default-200 p-5 text-small text-default-500">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {schedules.map((schedule) => (
            <li key={schedule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-large border border-default-200 bg-content1 p-4">
              <div className="min-w-0">
                <p className="font-semibold">{schedule.taskKey}</p>
                <p className="text-small text-default-500">
                  {t("every", { hours: Math.round((schedule.intervalMinutes / 60) * 10) / 10 })} · {t("next", { date: schedule.nextRun })}
                  {schedule.lastRun ? ` · ${t("last", { date: schedule.lastRun })}` : ""}
                </p>
              </div>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <Switch size="sm" isSelected={schedule.enabled} isDisabled={pending} aria-label={t("enabled")}
                    onValueChange={(enabled) => run(() => toggleScheduleAction({ id: schedule.id, enabled }), t("updated"))} />
                  <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("delete")} isDisabled={pending}
                    onPress={() => run(() => deleteScheduleAction({ id: schedule.id }), t("deleted"))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
