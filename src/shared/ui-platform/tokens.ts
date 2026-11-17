/**
 * Framework-independent ERP UI semantic contract.
 *
 * Business modules should consume semantic names/patterns instead of relying on
 * HeroUI implementation details or primitive palette values.
 */
export const ERP_UI_TOKENS = {
  surface: {
    page: "--ui-surface-page",
    card: "--ui-surface-card",
    muted: "--ui-surface-muted",
    selected: "--ui-surface-selected",
  },
  text: {
    primary: "--ui-text-primary",
    secondary: "--ui-text-secondary",
  },
  border: {
    default: "--ui-border-default",
    strong: "--ui-border-strong",
  },
  action: {
    primary: "--ui-action-primary",
    primaryForeground: "--ui-action-primary-foreground",
  },
  radius: {
    control: "--ui-radius-control",
    card: "--ui-radius-card",
  },
  elevation: {
    card: "--ui-shadow-card",
    floating: "--ui-shadow-floating",
  },
} as const;

export type ErpUiTokenGroup = keyof typeof ERP_UI_TOKENS;
