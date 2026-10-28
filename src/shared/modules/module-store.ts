import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { syncModuleSchemas } from "./sync-schemas";

const ROOT_DIR = process.cwd();
const CONFIG_FILE = path.join(ROOT_DIR, "src", "config", "modules-state.json");
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");

export function getModuleStates(): Record<string, boolean> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {
    // Okuma hatası durumunda varsayılan
  }

  return {
    auth: true,
    users: true,
    organization: true,
    audit: true,
    system: true,
    members: true,
    accounting: true,
    documents: true,
    meetings: true,
    donations: true,
  };
}

export function isModuleActive(key: string): boolean {
  const states = getModuleStates();
  if (states[key] !== undefined) {
    return states[key];
  }
  return true; // Bilinmeyen veya yeni modüller varsayılan olarak aktiftir
}

/**
 * Kayıtlı tüm modüller arasından aktif olanların anahtarlarını döner.
 * modules-state.json dosyasında henüz yer almayan yeni modüller varsayılan olarak aktiftir.
 */
export function getAllActiveModuleKeys(registeredKeys: string[]): string[] {
  const states = getModuleStates();
  return registeredKeys.filter((key) => states[key] !== false);
}

function safeRevalidateLayout() {
  try {
    revalidatePath("/", "layout");
  } catch {
    // Next.js istek bağlamı dışındaki çağrılarda (test / CLI) yoksayılır
  }
}

export async function setModuleActive(key: string, isActive: boolean): Promise<void> {
  const states = getModuleStates();
  states[key] = isActive;

  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(states, null, 2), "utf8");
    safeRevalidateLayout();
  } catch (error) {
    console.error(`[module-store] Failed to update state for module ${key}:`, error);
    throw error;
  }
}

/**
 * Yalnızca EXTENSION (eklenti) türündeki modülleri siler.
 * Çekirdek (CORE) veya Resmi (OFFICIAL) modüller silinemez.
 */
export async function deleteModuleExtension(key: string): Promise<{ success: boolean; error?: string }> {
  const targetDir = path.join(MODULES_DIR, key);

  if (!fs.existsSync(targetDir)) {
    return { success: false, error: "Modül klasörü bulunamadı." };
  }

  try {
    // Klasörü tamamen sil
    fs.rmSync(targetDir, { recursive: true, force: true });

    // Durum dosyasından kaldır
    const states = getModuleStates();
    delete states[key];
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(states, null, 2), "utf8");

    // Şemaları yeniden senkronize et
    syncModuleSchemas();

    safeRevalidateLayout();
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
