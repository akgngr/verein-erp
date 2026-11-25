// Client-safe action references; never export server-only queries from here.
export { saveWidgetPreferencesAction, resetWidgetPreferencesAction, setWidgetPolicyAction } from "./actions/preferences";
export type { WidgetSettingsRow } from "./services/preferences";
