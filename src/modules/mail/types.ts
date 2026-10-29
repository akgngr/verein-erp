import type {
  MAIL_LOG_STATUSES,
  MAIL_SECURITY_OPTIONS,
  MAIL_SORT_FIELDS,
  MAIL_TRANSPORTS,
} from "./constants";

export type MailTransport = (typeof MAIL_TRANSPORTS)[number];
export type MailSecurity = (typeof MAIL_SECURITY_OPTIONS)[number];
export type MailLogStatus = (typeof MAIL_LOG_STATUSES)[number];
export type MailSortField = (typeof MAIL_SORT_FIELDS)[number];
export type MailSortDirection = "asc" | "desc";

// ---------------------------------------------------------------------------
// Public API contract (used by other modules via @/modules/mail/server)
// ---------------------------------------------------------------------------

export interface MailMessage {
  /** Single recipient. Batch sends use one message per recipient. */
  to: string;
  toName?: string;
  subject: string;
  /** Plain-text body (required). */
  text: string;
  /** Optional HTML body. */
  html?: string;
  replyTo?: string;
  /** Logged with the attempt: which module sent it and for which record. */
  context: { module: string; reference?: string };
}

export type MailSendResult =
  | { ok: true; messageId: string; logId: string }
  | { ok: false; error: string; logId: string };

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Settings as shown in the UI — never contains the password. */
export interface MailSettingsView {
  transport: MailTransport;
  host: string | null;
  port: number;
  security: MailSecurity;
  username: string | null;
  hasPassword: boolean;
  fromAddress: string | null;
  fromName: string | null;
  replyTo: string | null;
  isConfigured: boolean;
  /** ISO timestamp, null when never saved. */
  updatedAt: string | null;
}

/** Fully resolved settings (server-only, includes decrypted password). */
export interface ResolvedMailConfig {
  transport: MailTransport;
  host: string;
  port: number;
  security: MailSecurity;
  username: string | null;
  password: string | null;
  fromAddress: string;
  fromName: string | null;
  replyTo: string | null;
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export interface MailLogRow {
  id: string;
  toAddress: string;
  toName: string | null;
  subject: string;
  status: MailLogStatus;
  error: string | null;
  messageId: string | null;
  module: string;
  reference: string | null;
  /** ISO timestamp */
  createdAt: string;
}

export interface MailLogFilters {
  search: string;
  status: MailLogStatus | null;
  module: string | null;
  sort: MailSortField;
  direction: MailSortDirection;
  requestedSort: MailSortField | null;
  requestedDirection: MailSortDirection | null;
  page: number;
  pageSize: number;
}

export interface MailLogListResult {
  items: MailLogRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface MailAbilities {
  canView: boolean;
  canSendTest: boolean;
  canUpdate: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type MailActionError =
  | "forbidden"
  | "validation"
  | "notConfigured"
  | "encryptionKeyMissing"
  | "passwordUnreadable"
  | "connectionFailed"
  | "sendFailed"
  | "unknown";

export type MailActionResult =
  | { ok: true }
  | { ok: false; error: MailActionError; detail?: string };

export type MailSearchParams = Record<string, string | string[] | undefined>;
