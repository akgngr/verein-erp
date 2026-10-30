import "server-only";

import { getDb } from "@/shared/db";
import { ActionError, listActiveUserOptions } from "@/modules/auth/server";

/**
 * Evrak şemasındaki referans alanlarının (categoryId, assigneeId, replyToId)
 * iş kuralı doğrulamaları (5. bölüm md. 8 ve md. 10). Create ve update
 * action'ları ortak kullanır.
 *
 * KARAR: Kategori/sorumlu doğrulaması yalnızca alan DEĞİŞTİĞİNDE uygulanır;
 * böylece pasife alınmış bir kategoriye/sorumluya bağlı eski evrak, bu alanları
 * değiştirmeden düzenlenebilir (pasif seçenekler formlarda seçilemez ama
 * mevcut kayıtlarda görünür kalır).
 */

/** Kategori kontrolü: var olmalı ve aktif olmalıdır. */
export async function validateCategory(categoryId: string | null): Promise<void> {
  if (!categoryId) return;
  const category = await getDb().documentCategory.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) {
    throw new ActionError("documents.errors.categoryInactive", {
      categoryId: ["documents.errors.categoryInactive"],
    });
  }
}

/** Sorumlu kontrolü: aktif kullanıcı olmalı; etiketi (ad) döner. */
export async function validateAssignee(
  assigneeId: string | null,
): Promise<{ id: string; label: string } | null> {
  if (!assigneeId) return null;
  const user = (await listActiveUserOptions()).find((option) => option.id === assigneeId);
  if (!user) {
    throw new ActionError("documents.errors.assigneeInactive", {
      assigneeId: ["documents.errors.assigneeInactive"],
    });
  }
  return { id: user.id, label: user.label };
}

/**
 * Yanıtlanan evrak kontrolü (kural 8): yalnızca GİDEN evrakta, yalnızca
 * GELEN ve silinmemiş bir evrak seçilebilir; kendi kendine bağlanamaz.
 */
export async function validateReplyTo(
  replyToId: string | null,
  direction: "INCOMING" | "OUTGOING",
  selfId?: string,
): Promise<void> {
  if (!replyToId) return;

  if (direction !== "OUTGOING") {
    throw new ActionError("documents.errors.replyOnlyOutgoing", {
      replyToId: ["documents.errors.replyOnlyOutgoing"],
    });
  }
  if (selfId && replyToId === selfId) {
    throw new ActionError("documents.errors.replySelf", {
      replyToId: ["documents.errors.replySelf"],
    });
  }
  const target = await getDb().document.findUnique({
    where: { id: replyToId },
    select: { direction: true, deletedAt: true },
  });
  if (!target || target.deletedAt || target.direction !== "INCOMING") {
    throw new ActionError("documents.errors.replyTargetInvalid", {
      replyToId: ["documents.errors.replyTargetInvalid"],
    });
  }
}
