import "server-only";

import { getDb } from "@/shared/db";
import { ActionError } from "@/modules/auth/server";

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
    throw new ActionError("Kategori bulunamadı veya pasif durumda.", {
      categoryId: ["Kategori bulunamadı veya pasif durumda."],
    });
  }
}

/** Sorumlu kontrolü: aktif kullanıcı olmalı; etiketi (ad) döner. */
export async function validateAssignee(
  assigneeId: string | null,
): Promise<{ id: string; label: string } | null> {
  if (!assigneeId) return null;
  const user = await getDb().user.findUnique({
    where: { id: assigneeId },
    select: { id: true, name: true, isActive: true },
  });
  if (!user || !user.isActive) {
    throw new ActionError("Sorumlu bulunamadı veya hesabı pasif durumda.", {
      assigneeId: ["Sorumlu bulunamadı veya hesabı pasif durumda."],
    });
  }
  return { id: user.id, label: user.name };
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
    throw new ActionError("Yanıtlanan evrak yalnızca giden evrakta seçilebilir.", {
      replyToId: ["Yanıtlanan evrak yalnızca giden evrakta seçilebilir."],
    });
  }
  if (selfId && replyToId === selfId) {
    throw new ActionError("Bir evrak kendine yanıt olarak bağlanamaz.", {
      replyToId: ["Bir evrak kendine yanıt olarak bağlanamaz."],
    });
  }
  const target = await getDb().document.findUnique({
    where: { id: replyToId },
    select: { direction: true, deletedAt: true },
  });
  if (!target || target.deletedAt || target.direction !== "INCOMING") {
    throw new ActionError("Yanıt verilecek evrak bulunamadı veya gelen evrak değil.", {
      replyToId: ["Yanıt verilecek evrak bulunamadı veya gelen evrak değil."],
    });
  }
}
