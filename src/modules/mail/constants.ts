import type { MailLogStatus, MailSecurity, MailSortField, MailTransport } from "./types";

export const MAIL_BASE_PATH = "/mail";
export const MAIL_LOGS_PATH = "/mail/kayitlar";
export const MAIL_SETTINGS_ID = "default";
export const MAIL_TEST_MODULE = "mail";

export const MAIL_TRANSPORTS = ["SMTP", "LOG"] as const;
export const MAIL_SECURITY_OPTIONS = ["STARTTLS", "SSL", "NONE"] as const;
export const MAIL_LOG_STATUSES = ["SENT", "FAILED", "LOGGED"] as const;

export const DEFAULT_MAIL_TRANSPORT: MailTransport = "SMTP";
export const DEFAULT_MAIL_SECURITY: MailSecurity = "STARTTLS";

/** Conventional ports per security mode (used as defaults / hints). */
export const MAIL_DEFAULT_PORTS: Record<MailSecurity, number> = {
  STARTTLS: 587,
  SSL: 465,
  NONE: 25,
};

/** i18n keys (relative to the `mail` namespace). */
export const MAIL_TRANSPORT_LABEL_KEYS: Record<MailTransport, string> = {
  SMTP: "transports.SMTP",
  LOG: "transports.LOG",
};

export const MAIL_SECURITY_LABEL_KEYS: Record<MailSecurity, string> = {
  STARTTLS: "security.STARTTLS",
  SSL: "security.SSL",
  NONE: "security.NONE",
};

export const MAIL_LOG_STATUS_LABEL_KEYS: Record<MailLogStatus, string> = {
  SENT: "statuses.SENT",
  FAILED: "statuses.FAILED",
  LOGGED: "statuses.LOGGED",
};

export const MAIL_LOG_STATUS_BADGE_CLASSES: Record<MailLogStatus, string> = {
  SENT: "bg-success-100 text-success-700",
  FAILED: "bg-danger-100 text-danger-700",
  LOGGED: "bg-default-100 text-default-700",
};

export const MAIL_SORT_FIELDS = ["createdAt", "toAddress", "subject", "status", "module"] as const;
export const DEFAULT_MAIL_SORT: MailSortField = "createdAt";

export const DEFAULT_MAIL_PAGE_SIZE = 10;
export const MAX_MAIL_PAGE_SIZE = 100;

/** Concurrent SMTP sends in sendMailBatch. */
export const MAIL_BATCH_CONCURRENCY = 5;

export const MAIL_CONNECTION_TIMEOUT_MS = 10000;
export const MAIL_SOCKET_TIMEOUT_MS = 20000;
export const MAIL_ERROR_MAX_LENGTH = 1000;

/** Timezone used for displaying timestamps (identical on server and client → no hydration mismatch). */
export const MAIL_DISPLAY_TIME_ZONE = "Europe/Berlin";

/** Error codes stored in MailLog.error for non-SMTP failures. */
export const MAIL_ERROR_CODES = {
  notConfigured: "MAIL_NOT_CONFIGURED",
  passwordUnreadable: "MAIL_PASSWORD_UNREADABLE",
  invalidMessage: "MAIL_INVALID_MESSAGE",
} as const;
