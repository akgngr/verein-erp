import { sendCampaignTask } from "@/modules/mailings/server";

/**
 * Görevler yalnızca bu statik kayıt listesine uygulama kodundan eklenir.
 * Kullanıcı tanımlı import yolu veya çalıştırılabilir kod desteklenmez.
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

/** Güvenilir modül görevleri. Yeni entegrasyonlar kendi modül task tanımlarını ekler. */
export const automationTasks = defineTaskRegistry([
  sendCampaignTask,
]);
