/**
 * Modül bağımlılıkları (saf): zorunlu (requires) ve önerilen (recommends). Modül Yönetimi, kurulum
 * sihirbazı, paket kurulumu ve doğrulayıcı aynı kuralları kullanır.
 */
type DepModule = { key: string; version?: string; category?: string; requires?: { module: string; version?: string }[]; recommends?: string[] };

function parts(version: string): number[] {
  return version.replace(/^>=\s*/, "").split(".").map((part) => Number(part) || 0);
}

/** "1.2.0" >= ">=1.1.0" ? */
export function satisfiesVersion(installed: string | undefined, required: string | undefined): boolean {
  if (!required) return true;
  if (!installed) return false;
  const a = parts(installed);
  const b = parts(required);
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  return true;
}

export type EnablePlan = {
  /** Birlikte etkinleştirilecek kurulu zorunlu modüller (dolaylılar dahil, sırayla). */
  enable: string[];
  /** Kurulu olmayan veya sürümü yetmeyen zorunlu modüller: önce yüklenmeli. */
  missing: { module: string; version?: string; installed?: string }[];
  /** Önerilen, şu an kapalı modüller (dolaylı zorunluların önerileri dahil değil). */
  recommended: string[];
};

/** Bir modül etkinleştirilirken gerekenler. `isEnabled` → modül açık mı (CORE her zaman açık sayılmalı). */
export function planEnable(key: string, all: DepModule[], isEnabled: (key: string) => boolean): EnablePlan {
  const byKey = new Map(all.map((mod) => [mod.key, mod]));
  const enable: string[] = [];
  const missing: EnablePlan["missing"] = [];
  const seen = new Set<string>([key]);
  const visit = (current: string) => {
    for (const req of byKey.get(current)?.requires ?? []) {
      const target = byKey.get(req.module);
      if (!target || !satisfiesVersion(target.version, req.version)) {
        if (!missing.some((item) => item.module === req.module)) missing.push({ module: req.module, version: req.version, installed: target?.version });
        continue;
      }
      if (seen.has(req.module)) continue;
      seen.add(req.module);
      visit(req.module);
      if (!isEnabled(req.module)) enable.push(req.module);
    }
  };
  visit(key);
  const recommended = (byKey.get(key)?.recommends ?? []).filter((rec) => byKey.has(rec) && !isEnabled(rec) && !enable.includes(rec));
  return { enable, missing, recommended };
}

/** Kapatılırken: bu modüle (dolaylı da) zorunlu bağlı ve şu an açık modüller. */
export function enabledDependents(key: string, all: DepModule[], isEnabled: (key: string) => boolean): string[] {
  const result: string[] = [];
  const queue = [key];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const mod of all) {
      if (mod.key === key || result.includes(mod.key)) continue;
      if ((mod.requires ?? []).some((req) => req.module === current) && isEnabled(mod.key)) {
        result.push(mod.key);
        queue.push(mod.key);
      }
    }
  }
  return result;
}

/** Zorunlu bağımlılık döngüleri (A → B → A); her döngü anahtar listesi olarak. */
export function findDependencyCycles(all: DepModule[]): string[][] {
  const byKey = new Map(all.map((mod) => [mod.key, mod]));
  const cycles: string[][] = [];
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (key: string) => {
    state.set(key, 1);
    stack.push(key);
    for (const req of byKey.get(key)?.requires ?? []) {
      if (!byKey.has(req.module)) continue;
      if (state.get(req.module) === 1) cycles.push([...stack.slice(stack.indexOf(req.module)), req.module]);
      else if (!state.has(req.module)) visit(req.module);
    }
    stack.pop();
    state.set(key, 2);
  };
  for (const mod of all) if (!state.has(mod.key)) visit(mod.key);
  return cycles;
}

/** Hazır ayar listesine zorunlu bağımlılıkları ekler (kurulum sihirbazı). */
export function withRequirements(keys: string[], all: DepModule[]): string[] {
  const result = new Set(keys);
  for (const key of keys) for (const extra of planEnable(key, all, (candidate) => result.has(candidate)).enable) result.add(extra);
  return [...result];
}
