import { defineModuleWidgets } from "@/shared/widgets/registry";

/**
 * Notifications contributes the bell to the header (Widget Platform, ADR 0007-widget-platform).
 * Mandatory: users cannot hide it; it disappears only if the user lacks `notifications:view`.
 */
export const widgets = defineModuleWidgets("notifications", [
  {
    id: "notifications.bell",
    slot: "header.right",
    size: "popover",
    titleKey: "notifications.widget.bell",
    priority: 10,
    mandatory: true,
    requiredPermissions: ["notifications:view"],
    load: () => import("./widgets/bell"),
  },
]);
