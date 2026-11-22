// Client-safe public entry: server actions remain authorization checked in the widgets module.
export { resetWidgetPreferencesAction, saveWidgetPreferencesAction } from "./actions/preferences";
export type { WidgetSettingsRow } from "./services/preferences";
