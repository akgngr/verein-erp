import "server-only";

import { getTranslations } from "next-intl/server";

import { isMessageKey, type MessageValues } from "./message-key";

/**
 * Sunucu: anahtar biçimindeki mesajı isteğin diline çevirir; değilse aynen döner.
 * İstek bağlamı yoksa (test, betik) mesaj olduğu gibi kalır.
 */
export async function getMessageTranslator(): Promise<(message: string, values?: MessageValues) => string> {
  try {
    const t = await getTranslations();
    return (message, values) => (isMessageKey(message) && t.has(message) ? t(message, values) : message);
  } catch {
    return (message) => message;
  }
}

/** Tek mesaj için kısayol (route handler'ların JSON hata yanıtları). */
export async function translateMessage(message: string, values?: MessageValues): Promise<string> {
  return (await getMessageTranslator())(message, values);
}
