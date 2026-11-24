import "server-only";

import { NextResponse } from "next/server";

import { isPortalEnabled } from "../../../services/auth-core";
import { confirmPortalConsentOptIn } from "../../../services/self-service";

export async function GET(request: Request): Promise<NextResponse> {
  if (!isPortalEnabled()) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await confirmPortalConsentOptIn(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "invalidOrExpired" }, { status: 400 });
  }

  return NextResponse.redirect(new URL("/portal?consent=confirmed", request.url));
}
