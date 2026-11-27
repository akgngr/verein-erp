import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getActivePortalSession } from "../../services/auth";
import { isPortalEnabled, PORTAL_SESSION_COOKIE } from "../../services/auth-core";
import { registerPortalEvent } from "../../services/rights";
import { isPortalActionLimited } from "../../services/portal-guard";

const EVENT_REGISTER_SCHEMA = z.object({
  eventId: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!isPortalEnabled()) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const session = await getActivePortalSession(cookieStore.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (await isPortalActionLimited("events", session.subjectRef)) {
    return NextResponse.json({ ok: false, error: "rateLimited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  const parsed = EVENT_REGISTER_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  const result = await registerPortalEvent(session.subjectRef, parsed.data.eventId);
  if (!result.ok) {
    const status =
      result.reason === "licenseRequired"
        ? 403
        : result.reason === "notFound"
          ? 404
          : 409;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  return NextResponse.json({ ok: true });
}
