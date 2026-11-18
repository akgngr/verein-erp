import { MAX_SNOOZE_DAYS } from "../schemas/item-state";

/**
 * Özet öğesini kullanıcı için gizleme/erteleme. Yalnız `SecretaryItemState` yazılır;
 * kaynak kayıt (fatura, görev…) hiçbir zaman değişmez. Kullanıcı kimliği her zaman
 * oturumdan gelir, bu yüzden bir kullanıcı başkasının öğe durumuna dokunamaz.
 */
export type ItemStateStore = {
  upsert: (args: { userId: string; itemId: string; state: "DISMISSED" | "SNOOZED"; until: Date | null }) => Promise<{ id: string }>;
  remove: (args: { userId: string; itemId: string }) => Promise<number>;
};

export class ItemStateError extends Error {}

/** Audit için içeriksiz meta: yalnız modül anahtarı ve durum (kaynak kimliği yok). */
export function auditMeta(itemId: string, state: string, until?: Date | null) {
  return { module: itemId.split(":")[0], state, ...(until ? { until: until.toISOString() } : {}) };
}

export async function dismissItem(store: ItemStateStore, userId: string, itemId: string) {
  return store.upsert({ userId, itemId, state: "DISMISSED", until: null });
}

export async function snoozeItem(store: ItemStateStore, userId: string, itemId: string, until: Date, now: Date) {
  if (Number.isNaN(until.getTime()) || until.getTime() <= now.getTime()) {
    throw new ItemStateError("secretary.errors.snoozeInPast");
  }
  if (until.getTime() - now.getTime() > MAX_SNOOZE_DAYS * 86_400_000) {
    throw new ItemStateError("secretary.errors.snoozeTooLong");
  }
  return store.upsert({ userId, itemId, state: "SNOOZED", until });
}

export async function restoreItem(store: ItemStateStore, userId: string, itemId: string) {
  return store.remove({ userId, itemId });
}

type Db = ReturnType<typeof import("@/shared/db").getDb>;

export function prismaItemStateStore(db: Db): ItemStateStore {
  return {
    upsert: ({ userId, itemId, state, until }) =>
      db.secretaryItemState.upsert({
        where: { userId_itemId: { userId, itemId } },
        create: { userId, itemId, state, until },
        update: { state, until },
        select: { id: true },
      }),
    remove: async ({ userId, itemId }) => (await db.secretaryItemState.deleteMany({ where: { userId, itemId } })).count,
  };
}
