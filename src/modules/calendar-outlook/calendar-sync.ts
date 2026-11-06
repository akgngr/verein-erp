import "server-only";

import { defineCalendarSync, syncFetch, syncJson, SyncAuthError, type CalendarSyncProvider, type RemoteEvent, type SyncAppConfig, type SyncCredentials } from "@/shared/calendar/sync";

const GRAPH = "https://graph.microsoft.com/v1.0";
const SCOPES = "offline_access openid email User.Read Calendars.Read";
const authority = (app: SyncAppConfig) => `https://login.microsoftonline.com/${encodeURIComponent(app.tenant || "common")}/oauth2/v2.0`;

type GraphDate = { dateTime: string; timeZone?: string };
type GraphEvent = { id: string; subject?: string; bodyPreview?: string; location?: { displayName?: string }; start?: GraphDate; end?: GraphDate; isAllDay?: boolean; isCancelled?: boolean };

const auth = (credentials: SyncCredentials) => ({ headers: { Authorization: `Bearer ${credentials.accessToken ?? ""}`, Prefer: 'outlook.timezone="UTC"' } });

/** Graph returns "2026-11-06T10:00:00.0000000" in the requested (UTC) zone. */
export function graphDate(value: GraphDate | undefined, allDay: boolean): Date | null {
  if (!value?.dateTime) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(value.dateTime);
  if (!match) return null;
  const [y, mo, d, h, mi, s] = match.slice(1).map(Number);
  return allDay ? new Date(y, mo - 1, d) : new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

export function mapGraphEvent(event: GraphEvent): RemoteEvent | null {
  if (event.isCancelled) return null;
  const allDay = Boolean(event.isAllDay);
  const start = graphDate(event.start, allDay);
  if (!start) return null;
  const end = graphDate(event.end, allDay) ?? new Date(start.getTime() + 3_600_000);
  return {
    remoteId: event.id,
    title: event.subject ?? "",
    description: event.bodyPreview || null,
    location: event.location?.displayName || null,
    start,
    end: allDay ? new Date(end.getTime() - 60_000) : end,
    allDay,
  };
}

const provider: CalendarSyncProvider = {
  key: "outlook",
  color: "#0078d4",
  auth: "oauth",
  allowedHosts: ["graph.microsoft.com", "login.microsoftonline.com"],
  oauth: {
    authorizeUrl(app, state, redirectUri) {
      const params = new URLSearchParams({ client_id: app.clientId, response_type: "code", redirect_uri: redirectUri, response_mode: "query", scope: SCOPES, prompt: "select_account", state });
      return `${authority(app)}/authorize?${params}`;
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
    const me = await syncJson<{ mail?: string; userPrincipalName?: string }>(provider, `${GRAPH}/me?$select=mail,userPrincipalName`, auth(credentials));
    return me.mail ?? me.userPrincipalName ?? "Outlook";
  },
  async listCalendars(credentials) {
    const list = await syncJson<{ value?: { id: string; name?: string; hexColor?: string }[] }>(provider, `${GRAPH}/me/calendars?$select=id,name,hexColor&$top=100`, auth(credentials));
    return (list.value ?? []).map((item) => ({ remoteId: item.id, name: item.name ?? item.id, color: item.hexColor || null }));
  },
  async listEvents(credentials, calendar, range) {
    const events: RemoteEvent[] = [];
    const params = new URLSearchParams({ startDateTime: range.from.toISOString(), endDateTime: range.to.toISOString(), $top: "500", $select: "id,subject,bodyPreview,location,start,end,isAllDay,isCancelled" });
    let next: string | undefined = `${GRAPH}/me/calendars/${encodeURIComponent(calendar.remoteId)}/calendarView?${params}`;
    for (let page = 0; next && page < 10; page += 1) {
      const body: { value?: GraphEvent[]; "@odata.nextLink"?: string } = await syncJson(provider, next, auth(credentials));
      for (const item of body.value ?? []) {
        const mapped = mapGraphEvent(item);
        if (mapped) events.push(mapped);
      }
      next = body["@odata.nextLink"];
    }
    return events;
  },
};

async function token(app: SyncAppConfig, params: Record<string, string>): Promise<SyncCredentials> {
  const response = await syncFetch(provider, `${authority(app)}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: app.clientId, client_secret: app.clientSecret, scope: SCOPES, ...params }),
  });
  if (response.status === 400) throw new SyncAuthError();
  if (!response.ok) throw new Error(`SYNC_HTTP_${response.status}`);
  const body = (await response.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
}

export const calendarSync = defineCalendarSync({ module: "calendar-outlook", providers: [provider] });
