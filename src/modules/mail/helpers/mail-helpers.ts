import {
  DEFAULT_MAIL_PAGE_SIZE,
  DEFAULT_MAIL_SECURITY,
  DEFAULT_MAIL_SORT,
  DEFAULT_MAIL_TRANSPORT,
  MAIL_CONNECTION_TIMEOUT_MS,
  MAIL_DEFAULT_PORTS,
  MAIL_DISPLAY_TIME_ZONE,
  MAIL_ERROR_MAX_LENGTH,
  MAIL_LOG_STATUS_BADGE_CLASSES,
  MAIL_LOG_STATUSES,
  MAIL_SECURITY_OPTIONS,
  MAIL_SORT_FIELDS,
  MAIL_SOCKET_TIMEOUT_MS,
  MAIL_TRANSPORTS,
  MAX_MAIL_PAGE_SIZE,
} from "../constants";
import type { MailSettingsFormValues } from "../schemas/mail-schema";
import type {
  MailLogFilters,
  MailLogStatus,
  MailSearchParams,
  MailSecurity,
  MailSettingsView,
  MailSortDirection,
  MailSortField,
  MailTransport,
  ResolvedMailConfig,
} from "../types";

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function isMailTransport(value: unknown): value is MailTransport {
  return includes(MAIL_TRANSPORTS, value);
}

export function isMailSecurity(value: unknown): value is MailSecurity {
  return includes(MAIL_SECURITY_OPTIONS, value);
}

export function isMailLogStatus(value: unknown): value is MailLogStatus {
  return includes(MAIL_LOG_STATUSES, value);
}

export function isMailSortField(value: unknown): value is MailSortField {
  return includes(MAIL_SORT_FIELDS, value);
}

export function isMailSortDirection(value: unknown): value is MailSortDirection {
  return value === "asc" || value === "desc";
}

export function toMailTransport(value: string): MailTransport {
  return isMailTransport(value) ? value : DEFAULT_MAIL_TRANSPORT;
}

export function toMailSecurity(value: string): MailSecurity {
  return isMailSecurity(value) ? value : DEFAULT_MAIL_SECURITY;
}

export function toMailLogStatus(value: string): MailLogStatus {
  return isMailLogStatus(value) ? value : "FAILED";
}

export function isValidEmail(value: string): boolean {
  return value.length <= 320 && EMAIL_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

export function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function truncateError(message: string): string {
  return message.length > MAIL_ERROR_MAX_LENGTH
    ? `${message.slice(0, MAIL_ERROR_MAX_LENGTH - 1)}…`
    : message;
}

export function getErrorMessage(error: unknown): string {
  return truncateError(error instanceof Error ? error.message : String(error));
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function getDefaultPort(security: MailSecurity): number {
  return MAIL_DEFAULT_PORTS[security];
}

/** Whether the stored settings are complete enough to send mail. */
export function isSettingsComplete(settings: {
  transport: MailTransport;
  host: string | null;
  fromAddress: string | null;
  username: string | null;
  hasPassword: boolean;
}): boolean {
  if (settings.transport === "LOG") return true;
  if (!settings.host || !settings.fromAddress) return false;
  return settings.username ? settings.hasPassword : true;
}

export function toMailSettingsFormValues(settings: MailSettingsView): MailSettingsFormValues {
  return {
    transport: settings.transport,
    host: settings.host ?? "",
    port: settings.port,
    security: settings.security,
    username: settings.username ?? "",
    password: "",
    fromAddress: settings.fromAddress ?? "",
    fromName: settings.fromName ?? "",
    replyTo: settings.replyTo ?? "",
  };
}

/** nodemailer SMTP options for a resolved configuration. */
export function buildSmtpOptions(config: ResolvedMailConfig) {
  return {
    host: config.host,
    port: config.port,
    secure: config.security === "SSL",
    requireTLS: config.security === "STARTTLS",
    ignoreTLS: config.security === "NONE",
    auth:
      config.username && config.password
        ? { user: config.username, pass: config.password }
        : undefined,
    connectionTimeout: MAIL_CONNECTION_TIMEOUT_MS,
    greetingTimeout: MAIL_CONNECTION_TIMEOUT_MS,
    socketTimeout: MAIL_SOCKET_TIMEOUT_MS,
  };
}

export function formatAddress(address: string, name: string | null | undefined) {
  return name ? { name, address } : address;
}

// ---------------------------------------------------------------------------
// Log filters
// ---------------------------------------------------------------------------

export function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max !== undefined ? Math.min(parsed, max) : parsed;
}

export function parseMailLogFilters(params: MailSearchParams): MailLogFilters {
  // Param names follow the shared DataTable URL state: q, filter.<key>, sort, dir, page, pageSize.
  const status = getSingleParam(params["filter.status"]);
  const moduleName = (getSingleParam(params["filter.module"]) ?? "").trim();
  const sort = getSingleParam(params.sort);
  const direction = getSingleParam(params.dir);
  const requestedSort = isMailSortField(sort) ? sort : null;
  const requestedDirection = requestedSort && isMailSortDirection(direction) ? direction : null;

  return {
    search: (getSingleParam(params.q) ?? "").trim(),
    status: isMailLogStatus(status) ? status : null,
    module: moduleName === "" ? null : moduleName,
    sort: requestedSort ?? DEFAULT_MAIL_SORT,
    direction: requestedDirection ?? "desc",
    requestedSort,
    requestedDirection,
    page: parsePositiveInt(getSingleParam(params.page), 1),
    pageSize: parsePositiveInt(
      getSingleParam(params.pageSize),
      DEFAULT_MAIL_PAGE_SIZE,
      MAX_MAIL_PAGE_SIZE,
    ),
  };
}

export function isTestModalRequested(params: MailSearchParams): boolean {
  return getSingleParam(params.action) === "test";
}

export function removeSearchParam(query: string, key: string): string {
  const params = new URLSearchParams(query);
  params.delete(key);
  return params.toString();
}

export function calculatePageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export function getLogStatusBadgeClass(status: MailLogStatus): string {
  return MAIL_LOG_STATUS_BADGE_CLASSES[status];
}

/** Formats an ISO timestamp in a fixed timezone (same output on server and client). */
export function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: MAIL_DISPLAY_TIME_ZONE,
  }).format(new Date(iso));
}
