/**
 * Modül yaşam döngüsü kancaları: src/modules/<modül>/lifecycle.ts içinde `lifecycle` dışa aktarılır,
 * `pnpm module:sync` src/lifecycle-registry.ts'i üretir. Sistem modülü, yönetici bir modülü
 * kapattığında ilgili `onDisable` kancasını çağırır (ör. demo verilerini temizleme).
 */
export type ModuleLifecycle = {
  moduleKey: string;
  onDisable?: () => Promise<void>;
};

export function defineLifecycle(lifecycle: ModuleLifecycle): ModuleLifecycle {
  return lifecycle;
}
