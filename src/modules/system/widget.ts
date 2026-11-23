import { defineModuleWidgets } from "@/shared/widgets/registry";

/** A harmless first consumer that proves the slot works without notifications. */
export const widgets = defineModuleWidgets("system", [
  {
    id: "system.settings",
    slot: "header.right",
    size: "compact",
    titleKey: "system.ui.widget.settings",
    requiredPermissions: ["settings:view"],
    defaultEnabled: true,
    priority: 10,
    load: () => import("./widgets/settings-shortcut"),
  },
]);
