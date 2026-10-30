import "server-only";

import { getDb } from "@/shared/db";
import type { ModuleAccessRecord } from "@/shared/modules/module-access";

// Onaylar system_settings tablosunda "module-access:<modül>" anahtarıyla JSON olarak tutulur.
// KARAR: dosyaya yazılmaz; üretim imajında src/config yazılabilir değildir.
const PREFIX = "module-access:";

export async function getAccessRecords(): Promise<Record<string, ModuleAccessRecord>> {
  const rows = await getDb().systemSetting.findMany({ where: { key: { startsWith: PREFIX } } });
  const records: Record<string, ModuleAccessRecord> = {};
  for (const row of rows) {
    try {
      records[row.key.slice(PREFIX.length)] = JSON.parse(row.value) as ModuleAccessRecord;
    } catch {
      // Bozuk kayıt: yok sayılır (resmi olmayan modül izin bekler).
    }
  }
  return records;
}

export async function getAccessRecord(key: string): Promise<ModuleAccessRecord | undefined> {
  return (await getAccessRecords())[key];
}

export async function setAccessRecord(key: string, record: ModuleAccessRecord): Promise<void> {
  const value = JSON.stringify(record);
  await getDb().systemSetting.upsert({
    where: { key: `${PREFIX}${key}` },
    create: { key: `${PREFIX}${key}`, value, description: "module-access approval" },
    update: { value },
  });
}
