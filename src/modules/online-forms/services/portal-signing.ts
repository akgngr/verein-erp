import "server-only";

import { getDb } from "@/shared/db";

export type PortalPendingFormRow = {
  id: string;
  kind: string;
  expiresAt: Date;
  createdAt: Date;
};

export async function listPendingOnlineFormsForPortal(
  memberId: string,
): Promise<PortalPendingFormRow[]> {
  const db = getDb();
  const rows = await db.onlineFormRequest.findMany({
    where: {
      subjectId: memberId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      kind: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  return rows;
}

/**
 * #580: Portal içi imza DEVRE DIŞI. Önceki uygulama formu belge gösterilmeden, imza/kanıt özeti ve PDF
 * oluşturulmadan ve üye kaydı güncellenmeden "COMPLETED" yapıyordu (hukuken geçersiz). Tam akış
 * (belge gösterimi → imza → kanıt → PDF → üye güncellemesi) e-postayla gönderilen `/formular/<belirteç>`
 * bağlantısındadır; portal yalnız bekleyen formları listeler. Bu fonksiyon tam akış portala bağlanana kadar
 * her zaman `false` döner ve hiçbir şeyi değiştirmez.
 */
export async function signOnlineFormForPortal(input: {
  memberId: string;
  subjectRef: string;
  requestId: string;
  signerName: string;
}): Promise<boolean> {
  void input;
  return false;
}
