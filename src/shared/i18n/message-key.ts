/**
 * Çeviri anahtarı biçimindeki mesajlar (örn. "members.validation.lastNameRequired").
 *
 * KARAR: Doğrulama (zod) ve iş kuralı (ActionError) mesajları kod içinde dil bağımsız
 * anahtar olarak yazılır; ekrana çıkarken kullanıcının diline çevrilir — sunucuda
 * createAction, istemcide form bileşenleri (useTranslateMessage). Anahtar olmayan metin
 * olduğu gibi gösterilir (geriye dönük uyum).
 */
export const MESSAGE_KEY_PATTERN = /^[a-zA-Z][\w-]*(\.[a-zA-Z0-9_]+)+$/;

export type MessageValues = Record<string, string | number>;

export function isMessageKey(message: string): boolean {
  return MESSAGE_KEY_PATTERN.test(message);
}
