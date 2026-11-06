import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { moduleCalendarSyncRegistry } from "@/calendar-sync-registry";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { getUserById } from "@/modules/users/automation";
import { MAX_REMOTE_EVENTS, SyncAuthError, type CalendarSyncProvider, type SyncAppConfig, type SyncCredentials } from "@/shared/calendar/sync";
import { getDb } from "@/shared/db";
import { canEncryptSecrets, openSecret, sealSecret } from "@/shared/security/secret-box";

import type { SyncAccountView, SyncSettingsData } from "../types";

const PURPOSE_CREDENTIALS = "calendar-sync-credentials";
const PURPOSE_APP = "calendar-sync-app";
const WINDOW_PAST_DAYS = 60;
const WINDOW_FUTURE_DAYS = 365;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** Providers of active (usable) plugin modules. */
export async function availableProviders(): Promise<CalendarSyncProvider[]> {
  const usable = new Set(await listUsableModuleKeys());
  return moduleCalendarSyncRegistry.filter((entry) => usable.has(entry.module)).flatMap((entry) => entry.providers);
}

async function providerOrThrow(key: string): Promise<CalendarSyncProvider> {
  const provider = (await availableProviders()).find((item) => item.key === key);
  if (!provider) throw new Error("SYNC_PROVIDER_UNAVAILABLE");
  return provider;
}

export function redirectUri(origin: string, provider: string): string {
  return `${origin}/api/calendar/sync/callback/${provider}`;
}

// ---------- OAuth application (admin) ----------

export async function getApp(provider: string): Promise<SyncAppConfig | null> {
  const row = await getDb().calendarSyncApp.findUnique({ where: { provider } });
  if (!row) return null;
  const clientSecret = openSecret(PURPOSE_APP, row.clientSecretEnc);
  return clientSecret ? { clientId: row.clientId, clientSecret, tenant: row.tenant ?? undefined } : null;
}

export async function saveApp(provider: string, input: { clientId: string; clientSecret?: string; tenant?: string | null }, actorId: string) {
  if (!canEncryptSecrets()) throw new Error("SYNC_NO_ENCRYPTION");
  await providerOrThrow(provider);
  const existing = await getDb().calendarSyncApp.findUnique({ where: { provider } });
  if (!existing && !input.clientSecret) throw new Error("SYNC_SECRET_REQUIRED");
  const clientSecretEnc = input.clientSecret ? sealSecret(PURPOSE_APP, input.clientSecret) : existing!.clientSecretEnc;
  await getDb().calendarSyncApp.upsert({
    where: { provider },
    create: { provider, clientId: input.clientId, clientSecretEnc, tenant: input.tenant || null, updatedById: actorId },
    update: { clientId: input.clientId, clientSecretEnc, tenant: input.tenant || null, updatedById: actorId },
  });
}

/** Admin view: never returns the secret. */
export async function listAppStatus(): Promise<{ provider: string; configured: boolean; clientId: string | null; tenant: string | null }[]> {
  const providers = (await availableProviders()).filter((provider) => provider.auth === "oauth");
  const rows = await getDb().calendarSyncApp.findMany({ where: { provider: { in: providers.map((item) => item.key) } } });
  return providers.map((provider) => {
    const row = rows.find((item) => item.provider === provider.key);
    return { provider: provider.key, configured: Boolean(row), clientId: row?.clientId ?? null, tenant: row?.tenant ?? null };
  });
}

// ---------- Accounts (per user) ----------

function sealCredentials(credentials: SyncCredentials): string {
  return sealSecret(PURPOSE_CREDENTIALS, JSON.stringify(credentials));
}

function openCredentials(payload: string | null): SyncCredentials | null {
  if (!payload) return null;
  const text = openSecret(PURPOSE_CREDENTIALS, payload);
  if (!text) return null;
  try {
    return JSON.parse(text) as SyncCredentials;
  } catch {
    return null;
  }
}

/** Start the OAuth flow: returns the provider's consent URL. */
export async function startOAuth(userId: string, providerKey: string, origin: string): Promise<string> {
  if (!canEncryptSecrets()) throw new Error("SYNC_NO_ENCRYPTION");
  const provider = await providerOrThrow(providerKey);
  const app = await getApp(providerKey);
  if (provider.auth !== "oauth" || !provider.oauth || !app) throw new Error("SYNC_APP_MISSING");
  const state = randomBytes(24).toString("base64url");
  await getDb().calendarSyncAccount.upsert({
    where: { provider_userId: { provider: providerKey, userId } },
    create: { provider: providerKey, userId, stateHash: hash(state) },
    update: { stateHash: hash(state) },
  });
  return provider.oauth.authorizeUrl(app, state, redirectUri(origin, providerKey));
}

/** OAuth callback: state must belong to the signed-in user. */
export async function completeOAuth(userId: string, providerKey: string, state: string, code: string, origin: string): Promise<string> {
  const provider = await providerOrThrow(providerKey);
  const app = await getApp(providerKey);
  if (!provider.oauth || !app) throw new Error("SYNC_APP_MISSING");
  const account = await getDb().calendarSyncAccount.findUnique({ where: { stateHash: hash(state) } });
  if (!account || account.userId !== userId || account.provider !== providerKey) throw new Error("SYNC_STATE_INVALID");
  // One-time state: clear before the network call.
  await getDb().calendarSyncAccount.update({ where: { id: account.id }, data: { stateHash: null } });
  const credentials = await provider.oauth.exchangeCode(app, code, redirectUri(origin, providerKey));
  const accountLabel = (await provider.accountLabel(credentials, app)).slice(0, 200);
  await getDb().calendarSyncAccount.update({
    where: { id: account.id },
    data: { credentialsEnc: sealCredentials(credentials), accountLabel, status: "ACTIVE", lastError: null },
  });
  return account.id;
}

/** Password providers (CalDAV): credentials are verified before they are stored. */
export async function connectWithPassword(userId: string, providerKey: string, input: { username: string; password: string; serverUrl?: string }): Promise<string> {
  if (!canEncryptSecrets()) throw new Error("SYNC_NO_ENCRYPTION");
  const provider = await providerOrThrow(providerKey);
  if (provider.auth !== "password") throw new Error("SYNC_PROVIDER_UNAVAILABLE");
  const credentials: SyncCredentials = { username: input.username, password: input.password, serverUrl: input.serverUrl || provider.defaultServerUrl };
  await provider.listCalendars(credentials, null);
  const accountLabel = (await provider.accountLabel(credentials, null)).slice(0, 200);
  const account = await getDb().calendarSyncAccount.upsert({
    where: { provider_userId: { provider: providerKey, userId } },
    create: { provider: providerKey, userId, credentialsEnc: sealCredentials(credentials), accountLabel, status: "ACTIVE" },
    update: { credentialsEnc: sealCredentials(credentials), accountLabel, status: "ACTIVE", lastError: null },
  });
  return account.id;
}

export async function disconnectAccount(userId: string, accountId: string) {
  await getDb().calendarSyncAccount.deleteMany({ where: { id: accountId, userId } });
}

export async function setSyncCalendarEnabled(userId: string, calendarId: string, enabled: boolean) {
  const calendar = await getDb().calendarSyncCalendar.findUnique({ where: { id: calendarId }, include: { account: { select: { userId: true } } } });
  if (!calendar || calendar.account.userId !== userId) throw new Error("SYNC_NOT_FOUND");
  await getDb().$transaction([
    getDb().calendarSyncCalendar.update({ where: { id: calendarId }, data: { enabled } }),
    ...(enabled ? [] : [getDb().calendarSyncEvent.deleteMany({ where: { calendarId } })]),
  ]);
}


export async function listUserAccounts(userId: string): Promise<SyncAccountView[]> {
  const providers = new Set((await availableProviders()).map((provider) => provider.key));
  const rows = await getDb().calendarSyncAccount.findMany({
    where: { userId, provider: { in: [...providers] }, NOT: { status: "PENDING", credentialsEnc: null } },
    include: { calendars: { orderBy: { name: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    accountLabel: row.accountLabel,
    status: row.status,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastError: row.lastError,
    calendars: row.calendars.map((calendar) => ({ id: calendar.id, name: calendar.name, color: calendar.color, enabled: calendar.enabled })),
  }));
}

// ---------- Sync ----------

/** Pull calendars and events of one account. Errors are stored as short codes, never remote payloads. */
export async function syncAccount(accountId: string): Promise<{ events: number }> {
  const db = getDb();
  const account = await db.calendarSyncAccount.findUnique({ where: { id: accountId }, include: { calendars: true } });
  if (!account) throw new Error("SYNC_NOT_FOUND");
  // Deleted user: remove the connection and its imported data (credentials included).
  // Deactivated user: keep it, but do not contact the provider on their behalf.
  const owner = await getUserById(account.userId);
  if (!owner) {
    await db.calendarSyncAccount.delete({ where: { id: accountId } });
    return { events: 0 };
  }
  if (!owner.isActive) return { events: 0 };
  const provider = await providerOrThrow(account.provider);
  const app = provider.auth === "oauth" ? await getApp(account.provider) : null;
  let credentials = openCredentials(account.credentialsEnc);
  if (!credentials || (provider.auth === "oauth" && !app)) {
    await db.calendarSyncAccount.update({ where: { id: accountId }, data: { status: "REAUTH", lastError: "SYNC_CREDENTIALS_UNREADABLE" } });
    return { events: 0 };
  }

  try {
    if (provider.oauth && app && credentials.expiresAt && credentials.expiresAt < Date.now() + 60_000) {
      credentials = await provider.oauth.refresh(app, credentials);
      await db.calendarSyncAccount.update({ where: { id: accountId }, data: { credentialsEnc: sealCredentials(credentials) } });
    }

    const remote = await provider.listCalendars(credentials, app);
    const remoteIds = new Set(remote.map((item) => item.remoteId));
    await db.calendarSyncCalendar.deleteMany({ where: { accountId, remoteId: { notIn: [...remoteIds] } } });
    for (const item of remote) {
      await db.calendarSyncCalendar.upsert({
        where: { accountId_remoteId: { accountId, remoteId: item.remoteId } },
        create: { accountId, remoteId: item.remoteId, name: item.name.slice(0, 200), color: item.color && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : provider.color },
        update: { name: item.name.slice(0, 200) },
      });
    }

    const now = Date.now();
    const range = { from: new Date(now - WINDOW_PAST_DAYS * 86_400_000), to: new Date(now + WINDOW_FUTURE_DAYS * 86_400_000) };
    const calendars = await db.calendarSyncCalendar.findMany({ where: { accountId, enabled: true } });
    let total = 0;
    for (const calendar of calendars) {
      const events = (await provider.listEvents(credentials, { remoteId: calendar.remoteId, name: calendar.name }, range, app))
        .filter((event) => event.end >= event.start)
        .slice(0, MAX_REMOTE_EVENTS);
      const unique = [...new Map(events.map((event) => [event.remoteId, event])).values()];
      await db.$transaction([
        db.calendarSyncEvent.deleteMany({ where: { calendarId: calendar.id } }),
        db.calendarSyncEvent.createMany({
          data: unique.map((event) => ({
            calendarId: calendar.id,
            remoteId: event.remoteId.slice(0, 500),
            title: event.title.slice(0, 500),
            description: event.description?.slice(0, 4000) ?? null,
            location: event.location?.slice(0, 500) ?? null,
            startsAt: event.start,
            endsAt: event.end,
            allDay: event.allDay,
          })),
        }),
      ]);
      total += unique.length;
    }
    await db.calendarSyncAccount.update({ where: { id: accountId }, data: { status: "ACTIVE", lastSyncAt: new Date(), lastError: null } });
    return { events: total };
  } catch (error) {
    const reauth = error instanceof SyncAuthError;
    const code = reauth ? "SYNC_AUTH" : error instanceof Error && /^SYNC_[A-Z_0-9]+$/.test(error.message) ? error.message : "SYNC_FAILED";
    console.warn(`[calendar-sync] ${account.provider} account ${accountId}: ${code}`);
    await db.calendarSyncAccount.update({ where: { id: accountId }, data: { status: reauth ? "REAUTH" : "ERROR", lastError: code } });
    return { events: 0 };
  }
}

/** Scheduled sync of all connected accounts of active providers. */
export async function syncAllAccounts(): Promise<{ accounts: number; events: number }> {
  const providers = (await availableProviders()).map((provider) => provider.key);
  const accounts = await getDb().calendarSyncAccount.findMany({
    where: { provider: { in: providers }, status: { in: ["ACTIVE", "ERROR"] }, credentialsEnc: { not: null } },
    select: { id: true },
  });
  let events = 0;
  for (const account of accounts) events += (await syncAccount(account.id)).events;
  return { accounts: accounts.length, events };
}

/** Imported events of the user's own enabled sync calendars (owner-only visibility). */
export async function loadSyncedRange(userId: string, from: Date, to: Date) {
  const providers = (await availableProviders()).map((provider) => provider.key);
  const calendars = await getDb().calendarSyncCalendar.findMany({
    where: { enabled: true, account: { userId, provider: { in: providers } } },
    include: { account: { select: { provider: true, accountLabel: true } } },
  });
  const events = calendars.length
    ? await getDb().calendarSyncEvent.findMany({
      where: { calendarId: { in: calendars.map((calendar) => calendar.id) }, startsAt: { lt: to }, endsAt: { gt: from } },
      orderBy: { startsAt: "asc" },
      take: 3000,
    })
    : [];
  return { calendars, events };
}

/** Everything the settings dialog needs; app config only for managers, never secrets. */
export async function syncSettingsFor(userId: string, canManage: boolean, origin: string): Promise<SyncSettingsData> {
  const providers = await availableProviders();
  const apps = await listAppStatus();
  return {
    providers: providers.map((provider) => ({
      key: provider.key,
      auth: provider.auth,
      defaultServerUrl: provider.defaultServerUrl ?? null,
      appConfigured: provider.auth === "password" || apps.some((app) => app.provider === provider.key && app.configured),
    })),
    accounts: await listUserAccounts(userId),
    apps: canManage ? apps.map((app) => ({ ...app, redirectUri: redirectUri(origin, app.provider) })) : null,
  };
}
