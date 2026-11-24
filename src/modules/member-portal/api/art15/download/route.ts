import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getActivePortalSession } from "../../../services/auth";
import {
  isPortalEnabled,
  isPortalStepUpActive,
  PORTAL_SESSION_COOKIE,
} from "../../../services/auth-core";
import { downloadPortalArt15Export } from "../../../services/rights";

export async function GET(request: Request): Promise<Response> {
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

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalidPayload" }, { status: 400 });
  }

  const file = await downloadPortalArt15Export(session.subjectRef, id);
  if (!file) {
    return NextResponse.json({ ok: false, error: "notFound" }, { status: 404 });
  }

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
