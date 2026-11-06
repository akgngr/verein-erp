import "server-only";

import { defineCalendarSync, syncFetch, syncJson, SyncAuthError, type CalendarSyncProvider, type RemoteEvent, type SyncAppConfig, type SyncCredentials } from "@/shared/calendar/sync";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";
const SCOPES = "openid email https://www.googleapis.com/auth/calendar.readonly";

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number };
type GoogleDate = { date?: string; dateTime?: string };
type GoogleEvent = { id: string; status?: string; summary?: string; description?: string; location?: string; start?: GoogleDate; end?: GoogleDate };

const auth = (credentials: SyncCredentials) => ({ headers: { Authorization: `Bearer ${credentials.accessToken ?? ""}` } });

/** "YYYY-MM-DD" (all-day, local) or RFC 3339 date-time. */
export function googleDate(value: GoogleDate | undefined): { date: Date; allDay: boolean } | null {
  if (value?.dateTime) return { date: new Date(value.dateTime), allDay: false };
  const match = value?.date && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.date);
  return match ? { date: new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])), allDay: true } : null;
}

export function mapGoogleEvent(event: GoogleEvent): RemoteEvent | null {
  if (event.status === "cancelled") return null;
  const start = googleDate(event.start);
  const end = googleDate(event.end);
  if (!start) return null;
  const endDate = end?.date ?? new Date(start.date.getTime() + 3_600_000);
  return {
    remoteId: event.id,
    title: event.summary ?? "",
    description: event.description ?? null,
    location: event.location ?? null,
    start: start.date,
    // Google all-day end dates are exclusive.
    end: start.allDay ? new Date(endDate.getTime() - 60_000) : endDate,
    allDay: start.allDay,
  };
}

const provider: CalendarSyncProvider = {
  key: "google",
  color: "#4285f4",
  auth: "oauth",
  allowedHosts: ["googleapis.com", "google.com"],
  oauth: {
    authorizeUrl(app, state, redirectUri) {
      const params = new URLSearchParams({ client_id: app.clientId, redirect_uri: redirectUri, response_type: "code", scope: SCOPES, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
      return `${AUTH}?${params}`;
    },
    async exchangeCode(app, code, redirectUri) {
      return token(app, { grant_type: "authorization_code", code, redirect_uri: redirectUri });
    },
    async refresh(app, credentials) {
      if (!credentials.refreshToken) throw new SyncAuthError();
      const next = await token(app, { grant_type: "refresh_token", refresh_token: credentials.refreshToken });
      return { ...next, refreshToken: next.refreshToken ?? credentials.refreshToken };
    },
  },
  async accountLabel(credentials) {
    const info = await syncJson<{ email?: string }>(provider, "https://openidconnect.googleapis.com/v1/userinfo", auth(credentials));
    return info.email ?? "Google";
  },
  async listCalendars(credentials) {
    const list = await syncJson<{ items?: { id: string; summary?: string; summaryOverride?: string; backgroundColor?: string }[] }>(provider, `${API}/users/me/calendarList?minAccessRole=reader`, auth(credentials));
    return (list.items ?? []).map((item) => ({ remoteId: item.id, name: item.summaryOverride ?? item.summary ?? item.id, color: item.backgroundColor ?? null }));
  },
  async listEvents(credentials, calendar, range) {
    const events: RemoteEvent[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page += 1) {
      const params = new URLSearchParams({ singleEvents: "true", orderBy: "startTime", timeMin: range.from.toISOString(), timeMax: range.to.toISOString(), maxResults: "250", ...(pageToken ? { pageToken } : {}) });
      const body = await syncJson<{ items?: GoogleEvent[]; nextPageToken?: string }>(provider, `${API}/calendars/${encodeURIComponent(calendar.remoteId)}/events?${params}`, auth(credentials));
      for (const item of body.items ?? []) {
        const mapped = mapGoogleEvent(item);
        if (mapped) events.push(mapped);
      }
      pageToken = body.nextPageToken;
      if (!pageToken) break;
    }
    return events;
  },
};

async function token(app: SyncAppConfig, params: Record<string, string>): Promise<SyncCredentials> {
  const response = await syncFetch(provider, TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: app.clientId, client_secret: app.clientSecret, ...params }),
  });
  if (response.status === 400) throw new SyncAuthError();
  if (!response.ok) throw new Error(`SYNC_HTTP_${response.status}`);
  const body = (await response.json()) as TokenResponse;
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
}

export const calendarSync = defineCalendarSync({ module: "calendar-google", providers: [provider] });
