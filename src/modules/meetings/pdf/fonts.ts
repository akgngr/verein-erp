import { registerSharedPdfFonts } from "@/shared/pdf/fonts";

/**
 * Tutanak PDF'i font kaydı: tüm PDF modülleri aynı NotoSans aile kaydını paylaşır
 * (ikinci kez Font.register çağrısı glif/kerning bozulmasına yol açar — #577).
 */
export function registerMinutesFonts(): void {
  registerSharedPdfFonts();
}
