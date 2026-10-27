import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * Ortak PDF font kaydı (Faz 4): standart PDF fontları Türkçe karakterleri
 * (ğ, Ğ, ş, Ş, İ, ı) render edemediği için Noto Sans (SIL OFL 1.1) kullanılır.
 * Dosyalar src/shared/pdf/fonts/ altındadır (Faz 4 Adım 6'da meetings/assets'ten
 * kopyalandı; KARAR: her yeni PDF modülü kendi font kopyasını taşımaz — tek
 * ortak kayıt kullanılır. Tutanak PDF'i kendi kaydını korur; içerik aynıdır).
 *
 * KARAR: Yol process.cwd() üzerinden çözülür — dev sunucuda ve standalone çıktıda
 * aynı göreli düzen korunur (next.config outputFileTracingIncludes fontları kopyalar).
 */

const FONTS_DIR = path.join(process.cwd(), "src/shared/pdf/fonts");

let registered = false;

/** Fontları bir kez kaydeder; her render öncesi çağrılması güvenlidir. */
export function registerSharedPdfFonts(): void {
  if (registered) return;
  Font.register({
    family: "NotoSans",
    fonts: [
      {
        src: path.join(FONTS_DIR, "NotoSans_400Regular.ttf"),
        fontWeight: 400,
      },
      {
        src: path.join(FONTS_DIR, "NotoSans_700Bold.ttf"),
        fontWeight: 700,
      },
    ],
  });
  registered = true;
}
