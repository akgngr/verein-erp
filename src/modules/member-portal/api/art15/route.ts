import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getActivePortalSession } from "../../services/auth";
import {
  isPortalEnabled,
  isPortalStepUpActive,
  PORTAL_SESSION_COOKIE,
} from "../../services/auth-core";
import { requestPortalArt15Export } from "../../services/rights";

export async function handlePortalArt15Post(): Promise<NextResponse> {
  if (!isPortalEnabled()) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const session = await getActivePortalSession(cookieStore.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!isPortalStepUpActive(session)) {
    return NextResponse.json({ ok: false, error: "stepUpRequired" }, { status: 403 });
  }

  const result = await requestPortalArt15Export(session.subjectRef);
  if (!result.ok) {
    const status = result.reason === "alreadyOpen" ? 409 : 404;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    expiresAt: result.expiresAt.toISOString(),
  });
}
