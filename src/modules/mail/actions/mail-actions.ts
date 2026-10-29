"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/shared/db";
import { ForbiddenError, UnauthorizedError, requirePermission } from "@/modules/auth/server";
import { mailPermissions } from "../permissions";
import {
  MAIL_BASE_PATH,
  MAIL_ERROR_CODES,
  MAIL_LOGS_PATH,
  MAIL_SETTINGS_ID,
  MAIL_TEST_MODULE,
} from "../constants";
import { emptyToNull, getErrorMessage } from "../helpers/mail-helpers";
import { mailSettingsSchema, mailTestSchema } from "../schemas/mail-schema";
import { decryptSecret, encryptSecret, hasEncryptionKey } from "../services/mail-crypto";
import { sendMail } from "../services/mail-service";
import { verifySmtpConnection } from "../services/mail-transport";
import type { MailActionResult } from "../types";

function toErrorResult(error: unknown): MailActionResult {
  // Let Next.js control-flow errors (redirect / notFound) propagate.
  unstable_rethrow(error);

  if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
    return { ok: false, error: "forbidden" };
  }

  console.error("[mail] action failed:", getErrorMessage(error));
  return { ok: false, error: "unknown" };
}

async function getStoredPasswordState() {
  const db = getDb();
  const settings = await db.mailSettings.findUnique({
    where: { id: MAIL_SETTINGS_ID },
    select: { passwordEncrypted: true },
  });
  return settings?.passwordEncrypted ?? null;
}

/** Saves SMTP settings. An empty password keeps the stored one; an empty username clears it. */
export async function saveMailSettingsAction(input: unknown): Promise<MailActionResult> {
  try {
    await requirePermission(mailPermissions, "update");

    const parsed = mailSettingsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };
    const values = parsed.data;

    const username = emptyToNull(values.username);
    const newPassword = values.password ?? "";

    let passwordEncrypted: string | null | undefined;
    if (!username) {
      passwordEncrypted = null;
    } else if (newPassword !== "") {
      if (!hasEncryptionKey()) return { ok: false, error: "encryptionKeyMissing" };
      passwordEncrypted = encryptSecret(newPassword);
    }

    const data = {
      transport: values.transport,
      host: emptyToNull(values.host),
      port: values.port,
      security: values.security,
      username,
      fromAddress: emptyToNull(values.fromAddress),
      fromName: emptyToNull(values.fromName),
      replyTo: emptyToNull(values.replyTo),
      ...(passwordEncrypted !== undefined ? { passwordEncrypted } : {}),
    };

    const db = getDb();
    await db.mailSettings.upsert({
      where: { id: MAIL_SETTINGS_ID },
      create: { id: MAIL_SETTINGS_ID, ...data },
      update: data,
    });

    revalidatePath(MAIL_BASE_PATH);
    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}

/**
 * Tests the SMTP connection with the values currently in the form (not yet saved).
 * An empty password falls back to the stored one.
 */
export async function verifyMailConnectionAction(input: unknown): Promise<MailActionResult> {
  try {
    await requirePermission(mailPermissions, "update");

    const parsed = mailSettingsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };
    const values = parsed.data;

    if (values.transport === "LOG") return { ok: true };

    const username = emptyToNull(values.username);
    let password: string | null = null;
    if (username) {
      if (values.password) {
        password = values.password;
      } else {
        const stored = await getStoredPasswordState();
        if (stored) {
          password = decryptSecret(stored);
          if (password === null) return { ok: false, error: "passwordUnreadable" };
        }
      }
    }

    try {
      await verifySmtpConnection({
        transport: values.transport,
        host: values.host ?? "",
        port: values.port,
        security: values.security,
        username,
        password,
        fromAddress: values.fromAddress ?? "",
        fromName: emptyToNull(values.fromName),
        replyTo: emptyToNull(values.replyTo),
      });
    } catch (connectionError) {
      return { ok: false, error: "connectionFailed", detail: getErrorMessage(connectionError) };
    }

    return { ok: true };
  } catch (error) {
    return toErrorResult(error);
  }
}

/** Sends a fixed test message with the saved settings. */
export async function sendTestMailAction(input: unknown): Promise<MailActionResult> {
  try {
    await requirePermission(mailPermissions, "create");

    const parsed = mailTestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const t = await getTranslations("mail");
    const result = await sendMail({
      to: parsed.data.to,
      subject: t("testMail.subject"),
      text: t("testMail.body"),
      context: { module: MAIL_TEST_MODULE, reference: "test" },
    });

    revalidatePath(MAIL_LOGS_PATH);

    if (result.ok) return { ok: true };
    if (result.error === MAIL_ERROR_CODES.notConfigured)
      return { ok: false, error: "notConfigured" };
    if (result.error === MAIL_ERROR_CODES.passwordUnreadable) {
      return { ok: false, error: "passwordUnreadable" };
    }
    return { ok: false, error: "sendFailed", detail: result.error };
  } catch (error) {
    return toErrorResult(error);
  }
}
