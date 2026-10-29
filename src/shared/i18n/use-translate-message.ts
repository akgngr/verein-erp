"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { isMessageKey, type MessageValues } from "./message-key";

/** İstemci: anahtar biçimindeki mesajı kullanıcının diline çevirir; değilse aynen döner. */
export function useTranslateMessage() {
  const t = useTranslations();
  return useCallback(
    (message: string | null | undefined, values?: MessageValues): string | undefined => {
      if (!message) return undefined;
      return isMessageKey(message) && t.has(message) ? t(message, values) : message;
    },
    [t],
  );
}
