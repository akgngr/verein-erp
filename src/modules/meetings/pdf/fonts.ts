import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * Tutanak PDF'i font kaydı (9. bölüm).
 *
 * KARAR: Standart PDF fontları Türkçe glifleri (ğ Ğ ş Ş İ ı) oluşturamaz;
 * Noto Sans (OFL lisansı) Regular ve Bold TTF'leri modül varlıklarına
 * gömülüdür (assets/fonts) ve Font.register ile tek aile olarak kaydedilir.
 * Yollar process.cwd()'den çözülür; standalone build'te dosyalar
 * outputFileTracingIncludes ile çıktıya dahil edilir (next.config).
 */

const FONT_DIR = path.resolve(process.cwd(), "src/modules/meetings/assets/fonts");

let registered = false;

export function registerMinutesFonts(): void {
  if (registered) return;
  Font.register({
    family: "NotoSans",
    fonts: [
      { src: path.join(FONT_DIR, "NotoSans_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "NotoSans_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  registered = true;
}
