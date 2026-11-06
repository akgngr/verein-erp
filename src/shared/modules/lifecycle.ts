/**
 * Modül yaşam döngüsü kancaları: src/modules/<modül>/lifecycle.ts içinde `lifecycle` dışa aktarılır,
 * `pnpm module:sync` src/lifecycle-registry.ts'i üretir. Sistem modülü, yönetici bir modülü
 * kapattığında ilgili `onDisable` kancasını çağırır (ör. demo verilerini temizleme).
 */
export type ModuleLifecycle = {
  moduleKey: string;
  onDisable?: () => Promise<void>;
  /**
   * Kullanıcı silinmeden hemen önce çağrılır (KVKK md. 7 / DSGVO Art. 17). Yalnız o kullanıcıya ait kişisel
   * verileri siler (veri politikasında `personalOwnerField` olan tablolar). Kurumsal kayıtlar (fiş, toplantı,
   * üye…) yasal saklama gereği kalır; içlerindeki ad etiketleri korunur. Modül kapalı olsa da çağrılır.
   */
  onUserDeleted?: (userId: string) => Promise<void>;
};

export function defineLifecycle(lifecycle: ModuleLifecycle): ModuleLifecycle {
  return lifecycle;
}
