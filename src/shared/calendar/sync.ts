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

import { recordEgress } from "@/shared/egress/record-egress";

/** HTTPS ve sağlayıcının izinli sunucu listesindeki (alt alan adları dahil) bir adres mi? */
export function isAllowedSyncUrl(allowedHosts: readonly string[], url: URL): boolean {
  return url.protocol === "https:" && allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

/** En fazla bu kadar yönlendirme izlenir (iCloud CalDAV bölüm sunucusuna 1–2 yönlendirme yapar). */
const MAX_SYNC_REDIRECTS = 5;

/**
 * fetch with host allowlist, timeout and JSON/text handling.
 *
 * #584: Yönlendirmeler elle izlenir: iCloud, CalDAV isteklerini 301/302 ile hesabın bölüm sunucusuna
 * (ör. p12-caldav.icloud.com) taşır. Her hedef aynı izin listesine göre yeniden doğrulanır (SSRF koruması
 * korunur); yöntem ve gövde 303 dışında aynen taşınır (PROPFIND/REPORT için gereklidir).
 */
export async function syncFetch(
  provider: Pick<CalendarSyncProvider, "allowedHosts"> & { key?: string },
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const parsed = new URL(url);
  if (!isAllowedSyncUrl(provider.allowedHosts, parsed)) {
    throw new Error("SYNC_HOST_NOT_ALLOWED");
  }
  const bodyBytes = typeof init.body === "string"
    ? Buffer.byteLength(init.body)
    : init.body instanceof URLSearchParams
      ? Buffer.byteLength(init.body.toString())
      : 0;
  try {
    const signal = AbortSignal.timeout(20_000);
    let target = parsed;
    let request: RequestInit = init;
    for (let hop = 0; ; hop += 1) {
      const response = await fetch(target, { ...request, redirect: "manual", signal });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        if (hop >= MAX_SYNC_REDIRECTS) throw new Error("SYNC_TOO_MANY_REDIRECTS");
        const next = new URL(location, target);
        if (!isAllowedSyncUrl(provider.allowedHosts, next)) throw new Error("SYNC_HOST_NOT_ALLOWED");
        if (response.status === 303) request = { ...request, method: "GET", body: undefined };
        target = next;
        continue;
      }
      if (response.status === 401 || response.status === 403) throw new SyncAuthError();
      return response;
    }
  } finally {
    const providerKey = provider.key ?? provider.allowedHosts[0] ?? "calendar";
    await recordEgress({
      moduleKey: provider.key ? `calendar-${provider.key}` : "calendar",
      category: "CALENDAR_SYNC",
      provider: providerKey,
      volume: bodyBytes,
      count: 1,
      unit: "bytes",
      legalBasis: "CONSENT",
    });
  }
}

export async function syncJson<T>(
  provider: Pick<CalendarSyncProvider, "allowedHosts"> & { key?: string },
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await syncFetch(provider, url, init);
  if (!response.ok) throw new Error(`SYNC_HTTP_${response.status}`);
  return response.json() as Promise<T>;
}
