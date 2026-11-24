// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
// Widget Platform (#435): derleme anında güvenilen kayıt. Çalışma zamanında dosya taranmaz, yol çalıştırılmaz.
import { buildWidgetRegistry, type WidgetRegistration } from "@/shared/widgets/registry";

import { widgets as systemWidgets } from "@/modules/system/widget";
import { widgets as notificationsWidgets } from "@/modules/notifications/widget";
import { widgets as financeWidgets } from "@/modules/finance/widget";
import { widgets as weatherWidgets } from "@/modules/weather/widget";

/** Modüllerin widget'ları (src/modules/<modül>/widget.ts). */
export const widgetRegistry: readonly WidgetRegistration[] = buildWidgetRegistry([
  { module: "system", widgets: systemWidgets },
  { module: "notifications", widgets: notificationsWidgets },
  { module: "finance", widgets: financeWidgets },
  { module: "weather", widgets: weatherWidgets },
]);
