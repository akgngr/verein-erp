import { DEFAULT_PREFERENCES, type Preferences, type SecretaryChannel, SECRETARY_CHANNELS } from "../schemas/preferences";

/**
 * Kişisel sekreter tercihleri (#294). Kullanıcı kimliği her zaman oturumdan (veya worker'da
 * doğrulanmış kullanıcı kaydından) gelir; istekte gelen bir kullanıcı kimliğine güvenilmez.
 */
/** Veritabanındaki satır: kanallar serbest metin (eski/Pro kanalları olabilir), okurken süzülür. */
export type PreferenceRow = Omit<Preferences, "channels"> & { channels: string[]; lastBriefingOn: string | null };

export type PreferenceStore = {
  find: (userId: string) => Promise<PreferenceRow | null>;
  upsert: (userId: string, value: Preferences) => Promise<void>;
};

/** Kayıtlı değer yoksa varsayılanlar; tanınmayan kanallar (ör. eski Pro kanalı) süzülür. */
export async function getPreferences(store: PreferenceStore, userId: string): Promise<Preferences> {
  const row = await store.find(userId);
  if (!row) return { ...DEFAULT_PREFERENCES };
  const channels = row.channels.filter((channel): channel is SecretaryChannel => (SECRETARY_CHANNELS as readonly string[]).includes(channel));
  return {
    briefingEnabled: row.briefingEnabled,
    briefingTime: row.briefingTime,
    quietFrom: row.quietFrom,
    quietTo: row.quietTo,
    channels: channels.length ? channels : ["in_app"],
  };
}

/**
 * Kaydeder. `lastBriefingOn` korunur: saat değiştirmek aynı gün ikinci özet üretmez.
 * Dönüş, audit için içeriksiz meta (kanal ve açık/kapalı bilgisi; saat değerleri yok).
 */
export async function savePreferences(store: PreferenceStore, userId: string, value: Preferences) {
  await store.upsert(userId, value);
  return { briefingEnabled: value.briefingEnabled, channels: value.channels, quietHours: value.quietFrom !== null };
}

type Db = ReturnType<typeof import("@/shared/db").getDb>;

export function prismaPreferenceStore(db: Db): PreferenceStore {
  return {
    find: (userId) =>
      db.secretaryPreference.findUnique({
        where: { userId },
        select: { briefingEnabled: true, briefingTime: true, quietFrom: true, quietTo: true, channels: true, lastBriefingOn: true },
      }) as Promise<PreferenceRow | null>,
    upsert: async (userId, value) => {
      await db.secretaryPreference.upsert({
        where: { userId },
        create: { userId, ...value },
        update: { ...value },
      });
    },
  };
}
