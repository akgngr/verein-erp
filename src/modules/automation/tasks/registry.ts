/**
 * Görevler yalnızca bu statik kayıt listesine uygulama kodundan eklenir.
 * Kullanıcı tanımlı import yolu veya çalıştırılabilir kod desteklenmez.
 */
export function defineTaskRegistry<const T extends readonly { key: string }[]>(tasks: T): T {
  const keys = new Set<string>();
  for (const task of tasks) {
    if (keys.has(task.key)) {
      throw new Error(`Yinelenen otomasyon görevi anahtarı: ${task.key}`);
    }
    keys.add(task.key);
  }
  return Object.freeze([...tasks]) as unknown as T;
}

/** Modüllerin güvenilir görevleri sonraki entegrasyon PR'larında buraya kaydedilir. */
export const automationTasks = defineTaskRegistry([]);
