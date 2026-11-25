"use client";

import { notify } from "@/shared/components/ui/notify";
import { Input, Label, Select, Spinner, Switch, TextField, Button } from "@/shared/components/kit";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  createScheduleAction,
  deleteScheduleAction,
  toggleScheduleAction,
} from "../actions/automation-actions";

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
  // #586: Görev anahtarı (ör. "meetings.vote_purge") yerine okunur ad; çevirisi olmayan yeni görevlerde anahtar.
  const taskLabel = (key: string) => (t.has(`taskLabels.${key}`) ? t(`taskLabels.${key}`) : key);
  const interval = (minutes: number) => {
    if (minutes < 60) return t("everyMinutes", { minutes });
    if (minutes % 1440 === 0) return t("everyDays", { days: minutes / 1440 });
    return t("every", { hours: Math.round((minutes / 60) * 10) / 10 });
  };

  const run = (
    promise: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
  ) =>
    startTransition(async () => {
      const response = await promise();
      if (!response.ok)
        return void notify.error(response.error);
      notify.success(success);
      router.refresh();
    });

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-sm text-ink-500">{t("description")}</p>
      </div>

      {canManage && tasks.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-ink-200 bg-surface p-4">
          <Select
            className="max-w-xs"
            value={taskKey ? taskKey : null}
            onChange={(selectedValue) => {
              const keys =
                selectedValue === null ? undefined : String(selectedValue);
              return setTaskKey(String(keys ?? ""));
            }} size="sm">
            <Label>{t("task")}</Label>
                {tasks.map((task) => (
                  <Select.Item
                    key={task.key}
                    id={task.key}
                    textValue={taskLabel(task.key)}
                  >
                    <Label>{taskLabel(task.key)}</Label>
                  </Select.Item>
                ))}
          </Select>
          <TextField
            value={hours}
            onChange={setHours}
            className={["max-w-[10rem]"].filter(Boolean).join(" ")}
          >
            <Label>{t("intervalHours")}</Label>
            <Input
              type="number"
              min={1}
              className={["h-9 text-sm"].filter(Boolean).join(" ")}
            />
          </TextField>
          <Button
            size="md"
            isDisabled={!taskKey}
            onPress={() =>
              run(
                () =>
                  createScheduleAction({
                    taskKey,
                    intervalMinutes: Math.round(Number(hours) * 60),
                  }),
                t("created"),
              )
            }
            variant={actionVariant("primary", "solid")}
            isPending={pending}
          >
            {pending ? <Spinner size="sm" tone="current" /> : null}
            {<Plus className="h-4 w-4" />}
            {t("add")}
          </Button>
        </div>
      ) : null}

      {schedules.length === 0 ? (
        <p className="rounded-xl border border-ink-200 p-5 text-sm text-ink-500">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {schedules.map((schedule) => (
            <li
              key={schedule.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold">{taskLabel(schedule.taskKey)}</p>
                <p className="text-sm text-ink-500">
                  {interval(schedule.intervalMinutes)}{" "}
                  · {t("next", { date: schedule.nextRun })}
                  {schedule.lastRun
                    ? ` · ${t("last", { date: schedule.lastRun })}`
                    : ""}
                </p>
              </div>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <Switch
                    isSelected={schedule.enabled}
                    isDisabled={pending}
                    aria-label={`${t("enabled")}: ${taskLabel(schedule.taskKey)}`}
                    onChange={(enabled) =>
                      run(
                        () =>
                          toggleScheduleAction({ id: schedule.id, enabled }),
                        t("updated"),
                      )
                    }
                    size={"sm"}
                  >
                      <Label></Label>
                  </Switch>
                  <Button
                    isIconOnly
                    size="sm"
                    aria-label={`${t("delete")}: ${taskLabel(schedule.taskKey)}`}
                    isDisabled={pending}
                    onPress={() =>
                      run(
                        () => deleteScheduleAction({ id: schedule.id }),
                        t("deleted"),
                      )
                    }
                    variant={actionVariant("danger", "light")}
                  >
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
