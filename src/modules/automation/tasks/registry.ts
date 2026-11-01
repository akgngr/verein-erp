import type { AnyTaskDefinition } from "@/shared/automation/define";

/**
 * Görevler yalnızca bu statik kayıt listesine uygulama kodundan eklenir.
 * Kullanıcı tanımlı import yolu veya çalıştırılabilir kod desteklenmez.
 */
export const automationTasks: readonly AnyTaskDefinition[] = [];
