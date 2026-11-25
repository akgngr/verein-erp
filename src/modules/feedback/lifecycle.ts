import "server-only";

import { getDb } from "@/shared/db";
import { removeFile } from "@/shared/files";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/**
 * #583 (DSGVO Art. 17): Kullanıcı silinince geri bildirim kayıtları anonimleştirilir ve ekran görüntüleri
 * silinir. KARAR: Başlık/açıklama ürün hatası olarak tutulur (form içerikleri zaten kaydedilmez); kişiyi
 * gösteren alanlar (kimlik, ad/e-posta etiketi, ekran görüntüsü, sayfa adresi, tarayıcı bilgisi) kaldırılır.
 */
export const DELETED_REPORTER_ID = "deleted-user";

export const lifecycle = defineLifecycle({
  moduleKey: "feedback",
  onUserDeleted: async (userId) => {
    const db = getDb();
    const items = await db.feedbackItem.findMany({ where: { reporterId: userId }, select: { screenshotPath: true } });
    if (items.length === 0) return;
    await db.feedbackItem.updateMany({
      where: { reporterId: userId },
      data: {
        reporterId: DELETED_REPORTER_ID,
        reporterLabel: "—",
        screenshotPath: null,
        screenshotName: null,
        screenshotMime: null,
        pageUrl: null,
        userAgent: null,
      },
    });
    // Dosyalar kayıt anonimleştirildikten sonra silinir (silme hatası kişiyi kayda geri bağlamaz).
    for (const item of items) {
      if (item.screenshotPath) await removeFile(item.screenshotPath).catch(() => undefined);
    }
  },
});
