/**
 * Calendar sync plugin contract (src/modules/<module>/calendar-sync.ts).
 *
 * A plugin module only provides a provider adapter. Accounts, encrypted
 * credentials, the OAuth callback, scheduling and storage belong to the
 * calendar module. Phase 1 is one-way: remote → calendar (read-only).
 */

/** Decrypted credentials; only ever held in server memory. */
export type SyncCredentials = {
  accessToken?: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
  username?: string;
  password?: string;
  serverUrl?: string;
};

/** OAuth application registered by the administrator (client secret decrypted). */
export type SyncAppConfig = { clientId: string; clientSecret: string; tenant?: string };

export type RemoteCalendar = { remoteId: string; name: string; color?: string | null };

/** One concrete occurrence (providers expand recurring series server-side). */
export type RemoteEvent = {
  remoteId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
};

export type SyncRange = { from: Date; to: Date };

type OAuthHandlers = {
  authorizeUrl(app: SyncAppConfig, state: string, redirectUri: string): string;
  exchangeCode(app: SyncAppConfig, code: string, redirectUri: string): Promise<SyncCredentials>;
  refresh(app: SyncAppConfig, credentials: SyncCredentials): Promise<SyncCredentials>;
};

export type CalendarSyncProvider = {
  /** Unique, lowercase, e.g. "google". */
  key: string;
  color: string;
  /** "oauth": admin registers an app, each user signs in. "password": each user stores an app password. */
  auth: "oauth" | "password";
  oauth?: OAuthHandlers;
  /** Prefilled server for password providers (e.g. iCloud CalDAV). */
  defaultServerUrl?: string;
  /** Hosts this provider may contact; enforced before every request. */
  allowedHosts: string[];
  accountLabel(credentials: SyncCredentials, app: SyncAppConfig | null): Promise<string>;
  listCalendars(credentials: SyncCredentials, app: SyncAppConfig | null): Promise<RemoteCalendar[]>;
  listEvents(credentials: SyncCredentials, calendar: RemoteCalendar, range: SyncRange, app: SyncAppConfig | null): Promise<RemoteEvent[]>;
};

export type ModuleCalendarSync = { module: string; providers: CalendarSyncProvider[] };

export function defineCalendarSync(definition: ModuleCalendarSync): ModuleCalendarSync {
  return definition;
}

/** Thrown when the remote rejects the credentials; the account is marked for reconnection. */
export class SyncAuthError extends Error {
  constructor(message = "SYNC_AUTH") {
    super(message);
  }
}

/** Upper bound on events stored per calendar and sync. */
export const MAX_REMOTE_EVENTS = 2500;

/** fetch with host allowlist, timeout and JSON/text handling. */
export async function syncFetch(provider: Pick<CalendarSyncProvider, "allowedHosts">, url: string, init: RequestInit = {}): Promise<Response> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !provider.allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
    throw new Error("SYNC_HOST_NOT_ALLOWED");
  }
  const response = await fetch(parsed, { ...init, redirect: "error", signal: AbortSignal.timeout(20_000) });
  if (response.status === 401 || response.status === 403) throw new SyncAuthError();
  return response;
}

export async function syncJson<T>(provider: Pick<CalendarSyncProvider, "allowedHosts">, url: string, init: RequestInit = {}): Promise<T> {
  const response = await syncFetch(provider, url, init);
  if (!response.ok) throw new Error(`SYNC_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}
