// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
// Widget Platform (#435): derleme anında güvenilen kayıt. Çalışma zamanında dosya taranmaz, yol çalıştırılmaz.
import { buildWidgetRegistry, type WidgetRegistration } from "@/shared/widgets/registry";

/** Modüllerin widget'ları (src/modules/<modül>/widget.ts). */
export const widgetRegistry: readonly WidgetRegistration[] = buildWidgetRegistry([]);
