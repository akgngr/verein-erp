import { moduleAutomationEvents, moduleAutomationTasks } from "@/automation-registry";
import type { TaskDefinition } from "@/shared/automation/define";

import { builtinTasks } from "./builtin";

/**
 * Görevler yalnızca modüllerin `automation.ts` dosyalarından, `pnpm module:sync`
 * ile üretilen statik kayıttan gelir. Kullanıcı tanımlı import yolu veya
 * çalıştırılabilir kod desteklenmez.
 */
export function defineTaskRegistry<const T extends readonly { key: string }[]>(tasks: T): T {
  const keys = new Set<string>();
  for (const task of tasks) {
    if (keys.has(task.key)) {
      throw new Error("AUTOMATION_DUPLICATE_TASK_KEY");
    }
    keys.add(task.key);
  }
  return Object.freeze([...tasks]) as unknown as T;
}

/** Güvenilir modül görevleri (otomatik keşif). */
export const automationTasks = defineTaskRegistry([...builtinTasks, ...moduleAutomationTasks] as TaskDefinition[]);

/** Modüllerin yayımladığı olaylar (iş akışı tetikleyicileri). */
export const automationEvents = defineTaskRegistry(moduleAutomationEvents);

export function findAutomationEvent(key: string) {
  return automationEvents.find((event) => event.key === key);
}

export function findAutomationTask(key: string) {
  return automationTasks.find((task) => task.key === key);
}
