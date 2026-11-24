import { defineModuleWidgets } from "@/shared/widgets/registry";

export const widgets = defineModuleWidgets("weather", [
  {
    id: "weather.current",
    slot: "header.right",
    size: "popover",
    titleKey: "weather.widget.current",
    priority: 60,
    defaultEnabled: false,
    requiredPermissions: ["weather:view"],
    load: () => import("./widgets/current-header"),
  },
]);
