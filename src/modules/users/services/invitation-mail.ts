import "server-only";

import { ActionError } from "@/modules/auth/server";
import { getEnv } from "@/shared/env";

import { createInvitation, invitationLink, inviteMail } from "./invitations";

/** Shared by "invite" row action and user creation (setupMode = "invite"). Throws ActionError on failure. */
export async function sendInvitationTo(target: { id: string; name: string; email: string; locale: string }, actorId: string): Promise<Date> {
  const { isMailConfigured, sendMail } = await import("@/modules/mail/server");
  if (!(await isMailConfigured())) throw new ActionError("users.invite.errors.mailNotConfigured");
  const appUrl = getEnv().APP_URL;
  if (!appUrl || !invitationLink(appUrl, "x".repeat(43))) throw new ActionError("users.invite.errors.appUrl");
  const { token, expiresAt } = await createInvitation(target.id, actorId);
  const link = invitationLink(appUrl, token)!;
  const message = inviteMail(target.locale === "de" ? "de" : "tr", { name: target.name, link, expiresAt });
  const sent = await sendMail({ to: target.email, ...message, context: { module: "users", reference: `invite:${target.id}` } });
  if (!sent.ok) throw new ActionError("users.invite.errors.sendFailed");
  return expiresAt;
}

