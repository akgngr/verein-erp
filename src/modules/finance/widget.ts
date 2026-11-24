import { defineModuleWidgets } from "@/shared/widgets/registry";

export const widgets = defineModuleWidgets("finance", [
  {
    id: "finance.rates",
    slot: "header.right",
    size: "popover",
    titleKey: "finance.widget.rates",
    priority: 70,
    defaultEnabled: false,
    requiredPermissions: ["finance:view"],
    load: () => import("./widgets/rates-header"),
  },
]);
