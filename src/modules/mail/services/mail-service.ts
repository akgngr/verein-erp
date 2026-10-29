import "server-only";

import { randomUUID } from "node:crypto";
import { getDb } from "@/shared/db";
import { MAIL_BATCH_CONCURRENCY, MAIL_ERROR_CODES, MAIL_SETTINGS_ID } from "../constants";
import {
  emptyToNull,
  formatAddress,
  getErrorMessage,
  isSettingsComplete,
  toMailSecurity,
  toMailTransport,
} from "../helpers/mail-helpers";
import { mailMessageSchema } from "../schemas/mail-schema";
import type { MailLogStatus, MailMessage, MailSendResult, ResolvedMailConfig } from "../types";
import { decryptSecret } from "./mail-crypto";
import { createSmtpTransporter, type SmtpTransporter } from "./mail-transport";

type ConfigResolution =
  | { ok: true; config: ResolvedMailConfig }
  | { ok: false; error: (typeof MAIL_ERROR_CODES)[keyof typeof MAIL_ERROR_CODES] };

/** Loads stored settings and decrypts the password. */
export async function resolveStoredMailConfig(): Promise<ConfigResolution> {
  const db = getDb();
  const settings = await db.mailSettings.findUnique({ where: { id: MAIL_SETTINGS_ID } });
  if (!settings) return { ok: false, error: MAIL_ERROR_CODES.notConfigured };

  const transport = toMailTransport(settings.transport);
  const complete = isSettingsComplete({
    transport,
    host: settings.host,
    fromAddress: settings.fromAddress,
    username: settings.username,
    hasPassword: Boolean(settings.passwordEncrypted),
  });
  if (!complete) return { ok: false, error: MAIL_ERROR_CODES.notConfigured };

  let password: string | null = null;
  if (settings.passwordEncrypted) {
    password = decryptSecret(settings.passwordEncrypted);
    if (password === null && transport === "SMTP") {
      return { ok: false, error: MAIL_ERROR_CODES.passwordUnreadable };
    }
  }

  return {
    ok: true,
    config: {
      transport,
      host: settings.host ?? "",
      port: settings.port,
      security: toMailSecurity(settings.security),
      username: emptyToNull(settings.username),
      password,
      fromAddress: settings.fromAddress ?? "",
      fromName: emptyToNull(settings.fromName),
      replyTo: emptyToNull(settings.replyTo),
    },
  };
}

async function writeLog(
  message: Pick<MailMessage, "to" | "toName" | "subject" | "context">,
  status: MailLogStatus,
  details: { error?: string; messageId?: string } = {},
): Promise<string> {
  const db = getDb();
  const log = await db.mailLog.create({
    data: {
      toAddress: message.to.trim().slice(0, 320),
      toName: emptyToNull(message.toName),
      subject: message.subject.trim().slice(0, 998),
      status,
      error: details.error ?? null,
      messageId: details.messageId ?? null,
      module: message.context.module.trim().slice(0, 100) || "unknown",
      reference: emptyToNull(message.context.reference),
    },
    select: { id: true },
  });
  return log.id;
}

async function deliver(
  message: MailMessage,
  resolution: ConfigResolution,
  transporter: SmtpTransporter | null,
): Promise<MailSendResult> {
  const parsed = mailMessageSchema.safeParse(message);
  if (!parsed.success) {
    const error = MAIL_ERROR_CODES.invalidMessage;
    return { ok: false, error, logId: await writeLog(message, "FAILED", { error }) };
  }

  if (!resolution.ok) {
    const error = resolution.error;
    return { ok: false, error, logId: await writeLog(message, "FAILED", { error }) };
  }

  const { config } = resolution;
  const valid = parsed.data;

  if (config.transport === "LOG" || !transporter) {
    const messageId = `log-${randomUUID()}`;
    return { ok: true, messageId, logId: await writeLog(valid, "LOGGED", { messageId }) };
  }

  try {
    const info = await transporter.sendMail({
      from: formatAddress(config.fromAddress, config.fromName),
      to: formatAddress(valid.to, valid.toName),
      replyTo: emptyToNull(valid.replyTo) ?? config.replyTo ?? undefined,
      subject: valid.subject,
      text: valid.text,
      html: valid.html,
    });
    const messageId = info.messageId;
    return { ok: true, messageId, logId: await writeLog(valid, "SENT", { messageId }) };
  } catch (sendError) {
    const error = getErrorMessage(sendError);
    return { ok: false, error, logId: await writeLog(valid, "FAILED", { error }) };
  }
}

/**
 * Sends a single e-mail with the stored settings.
 * Never throws for delivery problems — check `result.ok`. Every attempt is logged.
 * Permission checks are the caller's responsibility.
 */
export async function sendMail(message: MailMessage): Promise<MailSendResult> {
  const [result] = await sendMailBatch([message]);
  return result;
}

/**
 * Sends many e-mails (one per recipient) reusing a single SMTP connection pool,
 * with limited concurrency. A failing recipient does not stop the others.
 * Results are returned in the same order as `messages`.
 */
export async function sendMailBatch(messages: MailMessage[]): Promise<MailSendResult[]> {
  if (messages.length === 0) return [];

  const resolution = await resolveStoredMailConfig();
  const transporter =
    resolution.ok && resolution.config.transport === "SMTP"
      ? createSmtpTransporter(resolution.config, { pooled: true })
      : null;

  const results: MailSendResult[] = new Array<MailSendResult>(messages.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < messages.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await deliver(messages[index], resolution, transporter);
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(MAIL_BATCH_CONCURRENCY, messages.length) }, worker),
    );
  } finally {
    transporter?.close();
  }

  return results;
}

/** True when stored settings are complete and the password (if any) is readable. */
export async function isMailConfigured(): Promise<boolean> {
  const resolution = await resolveStoredMailConfig();
  return resolution.ok;
}
