/** Serializable item rendered by the calendar UI (own entries and module sources). */
export type CalendarItemView = {
  /** Unique per occurrence. */
  id: string;
  /** Own entries: CalendarEntry id. */
  entryId: string | null;
  /** "calendar:<calendarId>" for own entries, "<module>:<sourceKey>" for module sources. */
  sourceId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  color: string;
  href: string | null;
  editable: boolean;
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  recurrenceInterval: number;
  recurrenceUntil: string | null;
  eventId: string | null;
  calendarId: string | null;
};

export type CalendarSourceView = {
  id: string;
  label: string;
  color: string;
  kind: "PERSONAL" | "SHARED" | "MODULE" | "EXTERNAL";
  editable: boolean;
};

export type SyncProviderView = { key: string; auth: "oauth" | "password"; defaultServerUrl: string | null; appConfigured: boolean };
export type SyncAccountView = {
  id: string;
  provider: string;
  accountLabel: string;
  status: "PENDING" | "ACTIVE" | "ERROR" | "REAUTH";
  lastSyncAt: string | null;
  lastError: string | null;
  calendars: { id: string; name: string; color: string; enabled: boolean }[];
};
export type SyncAppView = { provider: string; configured: boolean; clientId: string | null; tenant: string | null; redirectUri: string };
export type SyncSettingsData = { providers: SyncProviderView[]; accounts: SyncAccountView[]; canManage: boolean };
