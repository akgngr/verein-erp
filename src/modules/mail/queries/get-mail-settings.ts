import "server-only";

import { getDb } from "@/shared/db";
import { requirePermission } from "@/modules/auth/server";
import { mailPermissions } from "../permissions";
import { DEFAULT_MAIL_SECURITY, DEFAULT_MAIL_TRANSPORT, MAIL_SETTINGS_ID } from "../constants";
import {
  getDefaultPort,
  isSettingsComplete,
  toMailSecurity,
  toMailTransport,
} from "../helpers/mail-helpers";
import type { MailSettingsView } from "../types";

/** Current settings for the UI. The password is never returned. */
export async function getMailSettings(): Promise<MailSettingsView> {
  await requirePermission(mailPermissions, "view");
  const db = getDb();
  const settings = await db.mailSettings.findUnique({ where: { id: MAIL_SETTINGS_ID } });

  if (!settings) {
    return {
      transport: DEFAULT_MAIL_TRANSPORT,
      host: null,
      port: getDefaultPort(DEFAULT_MAIL_SECURITY),
      security: DEFAULT_MAIL_SECURITY,
      username: null,
      hasPassword: false,
      fromAddress: null,
      fromName: null,
      replyTo: null,
      isConfigured: false,
      updatedAt: null,
    };
  }

  const transport = toMailTransport(settings.transport);
  const hasPassword = Boolean(settings.passwordEncrypted);

  return {
    transport,
    host: settings.host,
    port: settings.port,
    security: toMailSecurity(settings.security),
    username: settings.username,
    hasPassword,
    fromAddress: settings.fromAddress,
    fromName: settings.fromName,
    replyTo: settings.replyTo,
    isConfigured: isSettingsComplete({
      transport,
      host: settings.host,
      fromAddress: settings.fromAddress,
      username: settings.username,
      hasPassword,
    }),
    updatedAt: settings.updatedAt.toISOString(),
  };
}
