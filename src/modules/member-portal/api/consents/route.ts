import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getActivePortalSession } from "../../services/auth";
import { isPortalEnabled, PORTAL_SESSION_COOKIE } from "../../services/auth-core";
import { requestPortalConsentOptIn, revokePortalConsent } from "../../services/self-service";

const CONSENT_ACTION_SCHEMA = z.object({
  action: z.enum(["revoke", "requestOptIn"]),
  target: z.enum(["bulkMail", "photo", "sms", "whatsapp", "telegram"]),
});

export async function handlePortalConsentPost(request: Request): Promise<NextResponse> {
  if (!isPortalEnabled()) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const session = await getActivePortalSession(cookieStore.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  const parsed = CONSENT_ACTION_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  if (parsed.data.action === "revoke") {
    const ok = await revokePortalConsent(session.subjectRef, parsed.data.target);
    return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
  }

  const origin = new URL(request.url).origin;
  const result = await requestPortalConsentOptIn({
    subjectRef: session.subjectRef,
    target: parsed.data.target,
    origin,
  });

  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 400 });
}
