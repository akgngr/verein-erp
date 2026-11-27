import { NextRequest, NextResponse } from "next/server";

import { isPortalEnabled, PORTAL_NONCE_COOKIE, PORTAL_SESSION_COOKIE } from "../../services/auth-core";
import { getActivePortalSession, signOutEverywhere } from "../../services/auth";
import { clearHostCookie } from "../../services/portal-guard";

export async function POST(req: NextRequest) {
  if (!isPortalEnabled()) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const rawSession = req.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  const session = await getActivePortalSession(rawSession);
  if (session) {
    await signOutEverywhere(session.subjectRef);
  }

  const res = NextResponse.redirect(new URL("/portal/giris", req.nextUrl.origin), 303);
  clearHostCookie(res, PORTAL_SESSION_COOKIE);
  clearHostCookie(res, PORTAL_NONCE_COOKIE);
  return res;
}
