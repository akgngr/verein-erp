import "server-only";

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { MAIL_BATCH_CONCURRENCY } from "../constants";
import { buildSmtpOptions } from "../helpers/mail-helpers";
import type { ResolvedMailConfig } from "../types";

export type SmtpTransporter = Transporter<SMTPTransport.SentMessageInfo>;

/**
 * Creates an SMTP transporter. With `pooled`, connections are reused across
 * messages (used by batch sends) and capped at MAIL_BATCH_CONCURRENCY.
 */
export function createSmtpTransporter(
  config: ResolvedMailConfig,
  { pooled = false }: { pooled?: boolean } = {},
): SmtpTransporter {
  const options: SMTPTransport.Options = buildSmtpOptions(config);
  if (!pooled) return nodemailer.createTransport(options);
  return nodemailer.createTransport({
    ...options,
    pool: true,
    maxConnections: MAIL_BATCH_CONCURRENCY,
  });
}

/** Connects to the SMTP server and checks authentication. Throws on failure. */
export async function verifySmtpConnection(config: ResolvedMailConfig): Promise<void> {
  const transporter = createSmtpTransporter(config);
  try {
    await transporter.verify();
  } finally {
    transporter.close();
  }
}
