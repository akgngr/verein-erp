export type ImeKeyboardEventLike = {
  key?: string;
  keyCode?: number;
  isComposing?: boolean;
  nativeEvent?: {
    isComposing?: boolean;
  };
};

/**
 * Klavyeden Enter tuşuna basıldığında IME kompozisyonunun aktif olup olmadığını denetler.
 * Japonca, Çince, Korece gibi IME kullanan dillerde karakter/kelime adayı onaylanırken
 * basılan Enter tuşunun mesajı vaktinden önce göndermesini engeller.
 *
 * Safari WebKit bug 165004 uyumluluğu için `event.keyCode === 229` (VK_PROCESSKEY) yedek kontrolü yapılır.
 */
export function isImeCompositionActive(event: ImeKeyboardEventLike): boolean {
  return Boolean(
    event.nativeEvent?.isComposing ||
      event.isComposing ||
      event.keyCode === 229,
  );
}

/**
 * Klavye olayı Enter tuşuna ait olduğunda form gönderiminin güvenli olup olmadığını belirler.
 * - Shift+Enter: Çok satırlı giriş için gönderilmez (false).
 * - IME aktif (isComposing veya keyCode 229): Karakter seçimi için gönderilmez (false).
 * - Yalnızca doğrudan Enter: Gönderilir (true).
 */
export function shouldSubmitOnEnter(
  event: ImeKeyboardEventLike & { shiftKey?: boolean },
): boolean {
  if (event.key !== "Enter" || event.shiftKey) {
    return false;
  }
  return !isImeCompositionActive(event);
}
