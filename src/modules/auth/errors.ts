/**
 * KARAR: Hata sınıfları auth modülünde yaşar; oturum/yetki/kurumsal aksiyon
 * hataları bu modülün public sunucu girişi (server.ts) üzerinden dışa aktarılır.
 */

/** Oturum yok veya kullanıcı veritabanından pasif olarak okundu. */
export class UnauthorizedError extends Error {
  constructor(message = "Oturum bulunamadı.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Oturum geçerli ama gerekli yetki yok. View'lar bunu <AccessDenied /> ile karşılar. */
export class ForbiddenError extends Error {
  constructor(message = "Bu işlem için yetkiniz yok.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** İş kuralı ihlali: mesajı doğrudan kullanıcıya gösterilir. */
export class ActionError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ActionError";
    this.fieldErrors = fieldErrors;
  }
}
